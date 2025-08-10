'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getProjectFiles,
  addProjectFiles,
  deleteProjectFile,
  getTaskFiles,
  addTaskFiles,
  deleteTaskFile,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';

function fileIconByMime(mime = '') {
  const m = mime.toLowerCase();
  if (m.includes('pdf')) return '📕';
  if (m.startsWith('image/')) return '🖼️';
  if (m.startsWith('audio/')) return '🎵';
  if (m.startsWith('video/')) return '🎬';
  if (m.includes('excel') || m.includes('spreadsheet') || m.endsWith('/vnd.ms-excel')) return '📊';
  if (m.includes('word') || m.endsWith('/msword')) return '📄';
  if (m.includes('zip') || m.includes('compressed')) return '🗜️';
  return '📎';
}

function humanFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) return bytes + ' B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + ' ' + units[u];
}

export default function FileManager({
  ownerType, // 'project' | 'task'
  ownerId,
  title = 'Files',
  bucket = 'filesmanagment',
  className = '',
}) {
  const { session } = useAuth();
  const [items, setItems] = useState([]); // [{name, path, url, size, type, uploaded_at}]
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const api = useMemo(() => ({
    list: ownerType === 'project' ? getProjectFiles : getTaskFiles,
    add: ownerType === 'project' ? addProjectFiles : addTaskFiles,
    del: ownerType === 'project' ? deleteProjectFile : deleteTaskFile,
  }), [ownerType]);

  const load = useCallback(async () => {
    if (!ownerId || !session) {
      console.log('[FileManager] Skipping load - missing ownerId or session:', { ownerId, hasSession: !!session });
      return;
    }
    setBusy(true);
    console.log('[FileManager] Loading files for:', { ownerType, ownerId, userRole: session?.user?.role });
    try {
      const files = await api.list(ownerId, session);
      console.log('[FileManager] Files loaded:', files);
      setItems(files || []);
    } catch (e) {
      console.error('[FileManager] Error loading files:', e);
      // Don't retry if it's a permissions error (403)
      if (e.message.includes('Failed to fetch task files')) {
        console.log('[FileManager] Permissions error - stopping retries');
      }
      setItems([]);
    } finally {
      setBusy(false);
    }
  }, [ownerId, session, api, ownerType]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh when window gains focus or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        load();
      }
    };

    const handleFocus = () => {
      load();
    };

    const handleDataUpdate = () => {
      load();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('tach:dataUpdated', handleDataUpdate);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('tach:dataUpdated', handleDataUpdate);
    };
  }, [load]);

  const openPicker = () => inputRef.current?.click();

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      const uploads = [];
      for (const file of fileList) {
        const ext = file.name.split('.').pop();
        const folder = ownerType === 'project' ? `projects/${ownerId}` : `tasks/${ownerId}`;
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext || 'bin'}`;
        const path = `${folder}/${filename}`;

        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });
        if (upErr) throw upErr;

        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
        const url = signed?.signedUrl || '';
        uploads.push({
          name: file.name,
          path,
          url,
          size: file.size,
          type: file.type || 'application/octet-stream',
          uploaded_at: new Date().toISOString(),
        });
      }

      const added = await api.add(ownerId, uploads, session);
      // Immediately show uploads in UI
      setItems(prev => {
        const currentByPath = new Map((prev || []).map(it => [it.path, it]));
        for (const it of uploads) {
          if (it && it.path) currentByPath.set(it.path, it);
        }
        // Prefer server-returned list if present
        const returned = Array.isArray(added) && added.length > 0 ? added : null;
        if (returned) {
          const serverByPath = new Map(returned.map(it => [it.path, it]));
          return Array.from(serverByPath.values());
        }
        return Array.from(currentByPath.values());
      });
      // Fetch canonical list from server (adds signed URLs for tasks/projects)
      try { await load(); } catch (_) {}
      
      // Notify other components about data update
      window.dispatchEvent(new CustomEvent('tach:dataUpdated'));
    } catch (e) {
      console.error('[FileManager] Upload failed:', e);
      // Force a reload to reflect server state and show any 403 via loader catch
      try { await load(); } catch (_) {}
    } finally {
      setBusy(false);
    }
  };

  const onInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Convert FileList to array for consistent iteration and append behaviour
      const list = Array.from(files);
      handleFiles(list);
      // Reset input value to allow selecting the same file name again
      e.target.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };

  const handleDelete = async (path) => {
    if (!path) return;
    setBusy(true);
    try {
      const updated = await api.del(ownerId, path, session);
      setItems(updated || []);
      // Notify other components about data update
      window.dispatchEvent(new CustomEvent('tach:dataUpdated'));
    } catch (_) {} finally { setBusy(false); }
  };

  const handleDownload = async (path, name) => {
    try {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error) return;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = name || 'download'; a.click();
      URL.revokeObjectURL(url);
    } catch (_) {}
  };

  const handlePreview = async (item) => {
    // Images/PDF can use signed URL; for others, attempt browser open
    let signedUrl = item.url;
    if (!signedUrl) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(item.path, 60 * 10);
      signedUrl = data?.signedUrl;
    }
    if (signedUrl) window.open(signedUrl, '_blank', 'noopener');
  };

  const Dropzone = (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`w-full ${items.length > 0 ? 'min-h-[90px]' : 'min-h-[140px]'} rounded-lg border border-dashed ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'} p-4 text-center text-gray-300`}
    >
      Drag & drop files here, or click Upload
    </div>
  );

  return (
    <div className={`w-full max-w-full min-w-0 bg-[#0f1116] border border-[#222733] rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <h3 className="text-base md:text-lg font-semibold text-white">{title}</h3>
        <div className="flex gap-2">
          <button type="button" onClick={openPicker} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs md:text-sm font-medium">Upload</button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={onInputChange} />
        </div>
      </div>

      {Dropzone}

      {busy && (
        <div className="text-gray-400 text-xs md:text-sm mt-2">Processing...</div>
      )}

      <div className="mt-3">
        {items.length === 0 ? (
          <div className="text-gray-400 text-center py-3">No files uploaded.</div>
        ) : (
          <ul className="divide-y divide-[#222733] rounded-lg overflow-hidden bg-[#121622] border border-[#222733]">
            {items.map((it) => (
              <li key={it.path} className="p-3 text-white flex items-center gap-3 hover:bg-[#161b26]">
                <div className="text-xl select-none" title={it.type}>{fileIconByMime(it.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" title={it.name}>{it.name}</div>
                  <div className="text-[11px] text-gray-400 flex flex-wrap gap-2 mt-0.5">
                    <span>{humanFileSize(it.size)}</span>
                    <span>•</span>
                    <span>{(it.type || '').split(';')[0]}</span>
                    {it.uploaded_at && (<><span>•</span><span>{new Date(it.uploaded_at).toLocaleString()}</span></>)}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  <button onClick={() => handlePreview(it)} className="px-2 py-1 text-[11px] bg-gray-600 hover:bg-gray-500 rounded">Preview</button>
                  <button onClick={() => handleDownload(it.path, it.name)} className="px-2 py-1 text-[11px] bg-gray-600 hover:bg-gray-500 rounded">Download</button>
                  <button onClick={() => handleDelete(it.path)} className="px-2 py-1 text-[11px] bg-red-600 hover:bg-red-700 rounded">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


