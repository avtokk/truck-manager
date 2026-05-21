import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './PermitsPage.css';

const COUNTRIES_KA = ['გერმანია 1', 'გერმანია 2', 'ბელგია', 'ჰოლანდია', 'ავსტრია'];
const COUNTRIES_EN = ['Germany 1', 'Germany 2', 'Belgium', 'Netherlands', 'Austria'];
const LOCAL_KEY = 'truckmanager_permits_v2';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { return null; }
}
function saveLocal(d) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch {}
}

export default function PermitsPage({ notifyChange, addNotification, t }) {
  const COUNTRIES = t.truck === 'Truck' ? COUNTRIES_EN : COUNTRIES_KA;
  const [truckNames, setTruckNames] = useState(() => loadLocal()?.truckNames || ['Truck 1','Truck 2','Truck 3']);
  const [permits, setPermits] = useState(() => loadLocal()?.permits || {});
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, 'data', 'permits'), (snap) => {
        if (snap.exists()) { const d = snap.data(); if (d.truckNames) setTruckNames(d.truckNames); if (d.permits) setPermits(d.permits); }
      }, () => {});
    } catch {}
    return () => unsub && unsub();
  }, []);

  const persist = (names, perms) => {
    saveLocal({ truckNames: names, permits: perms });
    try { setDoc(doc(db, 'data', 'permits'), { truckNames: names, permits: perms }).catch(() => {}); } catch {}
  };

  const updateTruckName = (idx, val) => {
    const next = truckNames.map((n,i) => i===idx ? val : n);
    setTruckNames(next); persist(next, permits);
  };

  const updateDate = (truckIdx, country, date) => {
    const key = '' + truckIdx;
    const next = { ...permits, [key]: { ...permits[key], [country]: { ...(permits[key]?.[country]||{}), date } } };
    setPermits(next); persist(truckNames, next);
  };

  const handleFileUpload = async (truckIdx, country, file) => {
    if (!file || file.type !== 'application/pdf') { addNotification(t.pdfOnly); return; }
    const uploadKey = truckIdx + '_' + country;
    setUploading(u => ({ ...u, [uploadKey]: true }));
    let fileUrl = null;
    try {
      const storageRef = ref(storage, 'permits/' + truckIdx + '_' + country + '_' + file.name);
      await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(storageRef);
    } catch {
      fileUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }
    const key = '' + truckIdx;
    const next = { ...permits, [key]: { ...permits[key], [country]: { ...(permits[key]?.[country]||{}), fileName: file.name, fileUrl } } };
    setPermits(next); persist(truckNames, next);
    setUploading(u => ({ ...u, [uploadKey]: false }));
    addNotification(truckNames[truckIdx] + ' - ' + country + ': ' + t.uploaded);
    notifyChange(truckNames[truckIdx] + ' - ' + country + ': ' + t.uploaded);
  };

  const downloadPermit = (truckIdx, country) => {
    const p = permits['' + truckIdx]?.[country];
    if (!p?.fileUrl) return;
    const a = document.createElement('a');
    a.href = p.fileUrl; a.download = p.fileName || 'permit.pdf'; a.target = '_blank'; a.click();
  };

  const addTruck = () => { const next = [...truckNames, 'Truck ' + (truckNames.length+1)]; setTruckNames(next); persist(next, permits); };
  const removeTruck = () => { if (truckNames.length<=1) return; const next = truckNames.slice(0,-1); setTruckNames(next); persist(next, permits); };

  return (
    <div className="permits-page">
      <div className="permits-header no-print">
        <h1 className="page-title">{t.permits}</h1>
        <div className="header-actions">
          <button className="ctrl-btn add" onClick={addTruck}>+</button>
          <button className="ctrl-btn rem" onClick={removeTruck}>&#8722;</button>
        </div>
      </div>
      <div className="permits-table-wrap">
        <table className="permits-table">
          <thead>
            <tr>
              <th className="th-truck">{t.truck}</th>
              {COUNTRIES.map(c => <th key={c} className="th-country">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {truckNames.map((name, truckIdx) => (
              <tr key={truckIdx} className="permits-row">
                <td className="td-truck">
                  <input className="truck-name-input" value={name} onChange={e => updateTruckName(truckIdx, e.target.value)} placeholder="Truck..." />
                </td>
                {COUNTRIES.map(country => {
                  const p = permits['' + truckIdx]?.[country] || {};
                  const uploadKey = truckIdx + '_' + country;
                  const isUploading = uploading[uploadKey];
                  const hasFile = !!p.fileUrl;
                  return (
                    <td key={country} className="td-permit">
                      <div className="permit-cell">
                        <input type="text" className="date-input" value={p.date||''} onChange={e => updateDate(truckIdx, country, e.target.value)} placeholder="DD.MM.YYYY" maxLength={10} />
                        <div className="permit-actions">
                          <label className={'upload-btn' + (isUploading ? ' uploading' : '')} title="PDF">
                            {isUploading ? '...' : '&#128206;'}
                            <input type="file" accept="application/pdf" style={{display:'none'}} onChange={e => { if (e.target.files[0]) handleFileUpload(truckIdx, country, e.target.files[0]); e.target.value=''; }} />
                          </label>
                          {hasFile && (
                            <button className="download-btn" onClick={() => downloadPermit(truckIdx, country)}>&#8595;</button>
                          )}
                        </div>
                        {hasFile && <span className="file-name">{p.fileName?.length>12 ? p.fileName.slice(0,12)+'...' : p.fileName}</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
