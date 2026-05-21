import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './PermitsPage.css';

const COUNTRIES = ['გერმანია 1', 'გერმანია 2', 'ბელგია', 'ჰოლანდია', 'ავსტრია'];
const LOCAL_KEY = 'truckmanager_permits_v2';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { return null; }
}
function saveLocal(d) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch {}
}

// permits[truckId][country] = { date, fileName, fileUrl (base64 or firebase url) }
const DEFAULT_TRUCKS = ['სატვირთო 1', 'სატვირთო 2', 'სატვირთო 3'];

export default function PermitsPage({ notifyChange, addNotification }) {
  const [truckNames, setTruckNames] = useState(() => loadLocal()?.truckNames || DEFAULT_TRUCKS);
  const [permits, setPermits] = useState(() => loadLocal()?.permits || {});
  const [uploading, setUploading] = useState({});
  const fileRefs = useRef({});

  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, 'data', 'permits'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.truckNames) setTruckNames(d.truckNames);
          if (d.permits) setPermits(d.permits);
        }
      }, () => {});
    } catch {}
    return () => unsub && unsub();
  }, []);

  const persist = (names, perms) => {
    saveLocal({ truckNames: names, permits: perms });
    try {
      setDoc(doc(db, 'data', 'permits'), { truckNames: names, permits: perms }).catch(() => {});
    } catch {}
  };

  const updateTruckName = (idx, val) => {
    const next = truckNames.map((n, i) => i === idx ? val : n);
    setTruckNames(next);
    persist(next, permits);
  };

  const updateDate = (truckIdx, country, date) => {
    const key = `${truckIdx}`;
    const next = {
      ...permits,
      [key]: {
        ...permits[key],
        [country]: { ...(permits[key]?.[country] || {}), date }
      }
    };
    setPermits(next);
    persist(truckNames, next);
  };

  const handleFileUpload = async (truckIdx, country, file) => {
    if (!file || file.type !== 'application/pdf') {
      addNotification('⚠ მხოლოდ PDF ფაილი'); return;
    }
    const uploadKey = `${truckIdx}_${country}`;
    setUploading(u => ({ ...u, [uploadKey]: true }));

    // Try Firebase Storage first, fallback to base64 local
    let fileUrl = null;
    try {
      const storageRef = ref(storage, `permits/${truckIdx}_${country}_${file.name}`);
      await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(storageRef);
    } catch {
      // Fallback: store as base64 in localStorage
      fileUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    const key = `${truckIdx}`;
    const next = {
      ...permits,
      [key]: {
        ...permits[key],
        [country]: {
          ...(permits[key]?.[country] || {}),
          fileName: file.name,
          fileUrl
        }
      }
    };
    setPermits(next);
    persist(truckNames, next);
    setUploading(u => ({ ...u, [uploadKey]: false }));
    addNotification(`📄 ${truckNames[truckIdx]} — ${country} პერმიტი ატვირთულია`);
    notifyChange(`📄 ${truckNames[truckIdx]} — ${country} პერმიტი განახლდა`);
  };

  const downloadPermit = (truckIdx, country) => {
    const p = permits[`${truckIdx}`]?.[country];
    if (!p?.fileUrl) return;
    const a = document.createElement('a');
    a.href = p.fileUrl;
    a.download = p.fileName || 'permit.pdf';
    a.target = '_blank';
    a.click();
  };

  const addTruck = () => {
    const next = [...truckNames, `სატვირთო ${truckNames.length + 1}`];
    setTruckNames(next);
    persist(next, permits);
  };

  const removeTruck = () => {
    if (truckNames.length <= 1) return;
    const next = truckNames.slice(0, -1);
    setTruckNames(next);
    persist(next, permits);
  };

  return (
    <div className="permits-page">
      <div className="permits-header no-print">
        <h1 className="page-title">📄 PERMITS</h1>
        <div className="header-actions">
          <button className="ctrl-btn add" onClick={addTruck}>+</button>
          <button className="ctrl-btn rem" onClick={removeTruck}>−</button>
        </div>
      </div>

      <div className="permits-table-wrap">
        <table className="permits-table">
          <thead>
            <tr>
              <th className="th-truck">სატვირთო</th>
              {COUNTRIES.map(c => (
                <th key={c} className="th-country">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {truckNames.map((name, truckIdx) => (
              <tr key={truckIdx} className="permits-row">
                <td className="td-truck">
                  <input
                    className="truck-name-input"
                    value={name}
                    onChange={e => updateTruckName(truckIdx, e.target.value)}
                    placeholder="სატვირთო..."
                  />
                </td>
                {COUNTRIES.map(country => {
                  const p = permits[`${truckIdx}`]?.[country] || {};
                  const uploadKey = `${truckIdx}_${country}`;
                  const isUploading = uploading[uploadKey];
                  const hasFile = !!p.fileUrl;
                  return (
                    <td key={country} className="td-permit">
                      <div className="permit-cell">
                        <input
                          type="text"
                          className="date-input"
                          value={p.date || ''}
                          onChange={e => updateDate(truckIdx, country, e.target.value)}
                          placeholder="DD.MM.YYYY"
                          maxLength={10}
                        />
                        <div className="permit-actions">
                          {/* Upload */}
                          <label
                            className={`upload-btn ${isUploading ? 'uploading' : ''}`}
                            title="PDF ატვირთვა"
                          >
                            {isUploading ? '⏳' : '📎'}
                            <input
                              type="file"
                              accept="application/pdf"
                              style={{ display: 'none' }}
                              onChange={e => {
                                if (e.target.files[0]) handleFileUpload(truckIdx, country, e.target.files[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {/* Download */}
                          {hasFile && (
                            <button
                              className="download-btn"
                              onClick={() => downloadPermit(truckIdx, country)}
                              title={`გადმოწერა: ${p.fileName}`}
                            >
                              ⬇
                            </button>
                          )}
                        </div>
                        {hasFile && (
                          <span className="file-name" title={p.fileName}>
                            {p.fileName?.length > 12 ? p.fileName.slice(0, 12) + '…' : p.fileName}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="permits-info no-print">
        <span>📎 = PDF ატვირთვა &nbsp;|&nbsp; ⬇ = გადმოწერა &nbsp;|&nbsp; თარიღი = ნებართვის ვადა</span>
      </div>
    </div>
  );
}
