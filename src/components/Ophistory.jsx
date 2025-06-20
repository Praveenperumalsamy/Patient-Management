import React, { useState, useEffect, useCallback } from 'react';
import './Ophistory.css';
import { db } from '../Firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// --- HistoryListModal Component ---
// This component will be rendered as a modal to display all history entries.
const HistoryListModal = ({ isOpen, onClose, historyRecords, onSelectHistory }) => {
  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB'); // Example: DD/MM/YYYY
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Select History Entry</h3>
        {historyRecords.length === 0 ? (
          <p>No history records available for this patient.</p>
        ) : (
          <ul className="history-list">
            {historyRecords.map((record, index) => (
              <li key={record.id || index} onClick={() => onSelectHistory(index)}>
                <strong>Date:</strong> {formatDate(record.date)} &nbsp;
                <strong>Time:</strong> {record.time} &nbsp;
                <span>({record.diagnosis ? `Diagnosis: ${record.diagnosis.substring(0, 50)}...` : 'No Diagnosis'})</span>
              </li>
            ))}
          </ul>
        )}
        <button onClick={onClose} className="modal-close-button">Close</button>
      </div>
    </div>
  );
};

// --- OPHistoryForm Component ---
const OPHistoryForm = () => {
  const [formData, setFormData] = useState({
    opNo: '',
    date: '',
    time: '',
    patientName: '',
    sex: '',
    age: '',
    refDoctor: '',
    historyExamination: '',
    investigation: '',
    temp: '',
    pr: '',
    bp: '',
    spo2: '',
    diagnosis: '',
    reviewDate: '',
  });

  const [currentPatientStaticDetails, setCurrentPatientStaticDetails] = useState(null);
  const [opHistoryRecords, setOpHistoryRecords] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [patientFileUrls, setPatientFileUrls] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchedOpNo, setLastFetchedOpNo] = useState(null);

  // NEW STATE: To control the visibility of the history list modal
  const [showHistoryListModal, setShowHistoryListModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    console.log('OPHistoryForm mounted');
    return () => {
      console.log('OPHistoryForm unmounted');
    };
  }, []);

  const getCurrentDateTime = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // 24-hour format
    });
    return { formattedDate, formattedTime };
  };

  useEffect(() => {
    const { formattedDate, formattedTime } = getCurrentDateTime();
    setFormData((prev) => ({
      ...prev,
      date: formattedDate,
      time: formattedTime,
    }));
  }, []);

  const fetchPatientDetailsByOpNo = useCallback(async (opNoToSearch) => {
    if (isFetching) {
      console.log('Already fetching, aborting duplicate fetch for opNo:', opNoToSearch);
      return;
    }
    if (opNoToSearch === lastFetchedOpNo && currentPatientStaticDetails) {
      console.log('opNo already successfully fetched, skipping re-fetch:', opNoToSearch);
      if (opNoToSearch) {
        fetchOPHistory(opNoToSearch);
      }
      return;
    }

    setIsFetching(true);
    console.log('fetchPatientDetailsByOpNo called with opNo:', opNoToSearch);

    if (!opNoToSearch) {
      console.log('No opNo provided, resetting form');
      setCurrentPatientStaticDetails(null);
      setFormData((prev) => {
        const { formattedDate, formattedTime } = getCurrentDateTime();
        const newFormData = {
          ...prev,
          patientName: '',
          sex: '',
          age: '',
          refDoctor: '',
          temp: '',
          pr: '',
          bp: '',
          spo2: '',
          historyExamination: '',
          investigation: '',
          diagnosis: '',
          reviewDate: '',
          date: formattedDate,
          time: formattedTime,
        };
        console.log('Reset formData:', newFormData);
        return newFormData;
      });
      setOpHistoryRecords([]);
      setCurrentHistoryIndex(-1);
      setPatientFileUrls([]);
      console.log('Setting isEditing to false in fetchPatientDetailsByOpNo (no opNo)');
      setIsEditing(false);
      setLastFetchedOpNo(null);
      setIsFetching(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'patients'),
        where('opNo', '==', opNoToSearch),
        limit(1)
      );
      console.log('Executing Firestore query for opNo:', opNoToSearch);
      const querySnapshot = await getDocs(q);
      console.log('Query snapshot empty?', querySnapshot.empty);

      if (!querySnapshot.empty) {
        const patientData = querySnapshot.docs[0].data();
        console.log('Fetched patient data:', patientData);
        console.log('Vitals from patient data:', {
          temp: patientData.temp || patientData.temperature || 'Not found',
          pr: patientData.pr || patientData.pulse || 'Not found',
          bp: patientData.bp || 'Not found',
          spo2: patientData.spo2 || 'Not found',
        });
        setCurrentPatientStaticDetails(patientData);
        const newVitals = {
          temp: patientData.temp || patientData.temperature || '',
          pr: patientData.pr || patientData.pulse || '',
          bp: patientData.bp || '',
          spo2: patientData.spo2 || '',
        };
        setFormData((prev) => {
          const newFormData = {
            ...prev,
            patientName: patientData.name || '',
            sex: patientData.sex || '',
            age: patientData.age || '',
            refDoctor: patientData.refDoctor || patientData.consultant || '',
            temp: newVitals.temp,
            pr: newVitals.pr,
            bp: newVitals.bp,
            spo2: newVitals.spo2,
            historyExamination: '',
            investigation: '',
            diagnosis: '',
            reviewDate: '',
          };
          console.log('Setting formData after patient fetch:', newFormData);
          return newFormData;
        });
        setPatientFileUrls(patientData.files && Array.isArray(patientData.files) ? patientData.files : []);
        toast.success(`Patient "${patientData.name}" details loaded.`, { duration: 3000 });
        setLastFetchedOpNo(opNoToSearch);
        setTimeout(() => fetchOPHistory(opNoToSearch), 500);
        console.log('Setting isEditing to false in fetchPatientDetailsByOpNo (patient found)');
        setIsEditing(false);
      } else {
        console.log('No patient found for opNo:', opNoToSearch);
        setCurrentPatientStaticDetails(null);
        setFormData((prev) => {
          const { formattedDate, formattedTime } = getCurrentDateTime();
          const newFormData = {
            ...prev,
            patientName: '',
            sex: '',
            age: '',
            refDoctor: '',
            temp: '',
            pr: '',
            bp: '',
            spo2: '',
            historyExamination: '',
            investigation: '',
            diagnosis: '',
            reviewDate: '',
            date: formattedDate,
            time: formattedTime,
          };
          console.log('Setting formData (no patient found):', newFormData);
          return newFormData;
        });
        setPatientFileUrls([]);
        toast.error('No patient found with this O.P. No.', { duration: 3000 });
        setOpHistoryRecords([]);
        setCurrentHistoryIndex(-1);
        console.log('Setting isEditing to false in fetchPatientDetailsByOpNo (no patient found)');
        setIsEditing(false);
        setLastFetchedOpNo(null);
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      toast.error('Error fetching patient details.', { duration: 3000 });
    } finally {
      setIsFetching(false);
    }
  }, [lastFetchedOpNo, isFetching, currentPatientStaticDetails]);

  const fetchOPHistory = useCallback(async (opNoToSearch) => {
    if (!opNoToSearch) {
      setOpHistoryRecords([]);
      setCurrentHistoryIndex(-1);
      console.log('Setting isEditing to false in fetchOPHistory (no opNo)');
      setIsEditing(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'opHistory'),
        where('opNo', '==', opNoToSearch),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('Fetched history data:', historyData);
      setOpHistoryRecords(historyData);

      if (historyData.length > 0) {
        loadHistoryEntry(0, historyData); // Load the newest history entry by default
      } else {
        setCurrentHistoryIndex(-1);
        toast.info("No history records found for this O.P. No. Use 'New' to add one.", { duration: 3000 });
        clearHistorySpecificFields();
        console.log('Setting isEditing to false in fetchOPHistory (no history found)');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error fetching O.P. History:', error);
      setOpHistoryRecords([]);
      setCurrentHistoryIndex(-1);
      console.log('Setting isEditing to false in fetchOPHistory (error)');
      setIsEditing(false);
    }
  }, [currentPatientStaticDetails]);

  // Debounced effect for fetching patient details when opNo changes
  useEffect(() => {
    const handler = setTimeout(() => {
      if (formData.opNo) {
        if (formData.opNo !== lastFetchedOpNo || !currentPatientStaticDetails) {
          fetchPatientDetailsByOpNo(formData.opNo);
        } else {
          console.log('Skipping patient details fetch, re-fetching history for same opNo.');
          fetchOPHistory(formData.opNo); // Ensure history is always refreshed
        }
      } else {
        fetchPatientDetailsByOpNo('');
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [formData.opNo, fetchPatientDetailsByOpNo, lastFetchedOpNo, currentPatientStaticDetails, fetchOPHistory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`);
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      console.log('Updated formData:', newFormData);
      return newFormData;
    });

    if (name === 'opNo') {
      setCurrentHistoryIndex(-1);
      setOpHistoryRecords([]);
      setPatientFileUrls([]);
      console.log('Setting isEditing to false because opNo changed');
      setIsEditing(false);
      setLastFetchedOpNo(null);
    }
  };

  const clearHistorySpecificFields = useCallback(() => {
    const { formattedDate, formattedTime } = getCurrentDateTime();
    const temp = formData.temp || currentPatientStaticDetails?.temp || currentPatientStaticDetails?.temperature || '';
    const pr = formData.pr || currentPatientStaticDetails?.pr || currentPatientStaticDetails?.pulse || '';
    const bp = formData.bp || currentPatientStaticDetails?.bp || '';
    const spo2 = formData.spo2 || currentPatientStaticDetails?.spo2 || '';
    console.log('Clearing history-specific fields, preserving vitals:', { temp, pr, bp, spo2 });
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        historyExamination: '',
        investigation: '',
        temp,
        pr,
        bp,
        spo2,
        diagnosis: '',
        reviewDate: '',
        date: formattedDate,
        time: formattedTime,
      };
      console.log('Updated formData after clearHistorySpecificFields:', newFormData);
      return newFormData;
    });
  }, [formData.temp, formData.pr, formData.bp, formData.spo2, currentPatientStaticDetails]);

  const resetForm = useCallback(() => {
    const { formattedDate, formattedTime } = getCurrentDateTime();
    const newFormData = {
      opNo: '',
      date: formattedDate,
      time: formattedTime,
      patientName: '',
      sex: '',
      age: '',
      refDoctor: '',
      historyExamination: '',
      investigation: '',
      temp: '',
      pr: '',
      bp: '',
      spo2: '',
      diagnosis: '',
      reviewDate: '',
    };
    console.log('Resetting form, new formData:', newFormData);
    setFormData(newFormData);
    setCurrentPatientStaticDetails(null);
    setOpHistoryRecords([]);
    setCurrentHistoryIndex(-1);
    setPatientFileUrls([]);
    console.log('Setting isEditing to false in resetForm');
    setIsEditing(false);
    setLastFetchedOpNo(null);
  }, []);

  const loadHistoryEntry = useCallback((index, records = opHistoryRecords) => {
    if (records.length === 0) {
      toast.info('No history entries to load.', { duration: 3000 });
      setCurrentHistoryIndex(-1);
      return;
    }

    let targetIndex = index;

    if (targetIndex >= 0 && targetIndex < records.length) {
      const entry = records[targetIndex];
      console.log('Loading history entry:', entry);

      const temp = entry.temp !== undefined && entry.temp !== null ? entry.temp : (formData.temp || currentPatientStaticDetails?.temp || currentPatientStaticDetails?.temperature || '');
      const pr = entry.pr !== undefined && entry.pr !== null ? entry.pr : (formData.pr || currentPatientStaticDetails?.pr || currentPatientStaticDetails?.pulse || '');
      const bp = entry.bp !== undefined && entry.bp !== null ? entry.bp : (formData.bp || currentPatientStaticDetails?.bp || '');
      const spo2 = entry.spo2 !== undefined && entry.spo2 !== null ? entry.spo2 : (formData.spo2 || currentPatientStaticDetails?.spo2 || '');
      console.log('Setting vitals from history entry:', { temp, pr, bp, spo2 });

      setFormData((prev) => {
        const newFormData = {
          ...prev,
          date: entry.date || getCurrentDateTime().formattedDate,
          time: entry.time || getCurrentDateTime().formattedTime,
          historyExamination: entry.historyExamination || '',
          investigation: entry.investigation || '',
          temp,
          pr,
          bp,
          spo2,
          diagnosis: entry.diagnosis || '',
          reviewDate: entry.reviewDate || '',
        };
        console.log('Updated formData after loadHistoryEntry:', newFormData);
        return newFormData;
      });
      setCurrentHistoryIndex(targetIndex);
      console.log('Setting isEditing to false in loadHistoryEntry');
      setIsEditing(false);
      toast.success(`History entry ${targetIndex + 1} of ${records.length} loaded.`, { duration: 2000 });
    } else {
      toast.info('Navigation boundary reached.', { duration: 2000 });
    }
  }, [formData.temp, formData.pr, formData.bp, formData.spo2, currentPatientStaticDetails, opHistoryRecords]);

  const handleNew = () => {
    if (!formData.opNo || !currentPatientStaticDetails) {
      toast.error('Please enter an O.P. No. and load patient details first to create a new entry.', { duration: 3000 });
      return;
    }
    clearHistorySpecificFields();
    setCurrentHistoryIndex(-1);
    console.log('Setting isEditing to true in handleNew');
    setIsEditing(true);
    toast.success('Ready for new history entry. Enter details and click "Save".', { duration: 3000 });
  };

  const handleEdit = () => {
    console.log('handleEdit clicked. Current index:', currentHistoryIndex, 'Records length:', opHistoryRecords.length);
    if (currentHistoryIndex === -1 || opHistoryRecords.length === 0) {
      toast.error('No history record selected to edit. Please navigate to a history entry first.', { duration: 3000 });
      return;
    }
    console.log('Setting isEditing to true in handleEdit');
    setIsEditing(true);
    toast.success('Form is now editable. Make changes and click "Save Changes".', { duration: 3000 });
  };

  const handleSave = async () => {
    if (!formData.opNo || !currentPatientStaticDetails) {
      toast.error('Please enter a valid O.P. No. and load patient details first.', { duration: 3000 });
      return;
    }
    if (!formData.historyExamination && !formData.diagnosis && !formData.investigation) {
      toast.error('History/Examination, Investigation, or Diagnosis cannot be empty to save a new entry.', { duration: 3000 });
      return;
    }
    if (currentHistoryIndex !== -1) {
      toast.error('You are trying to save a new entry while an existing one is loaded. Please use "New" for new entries or "Save Changes" for edits.', { duration: 5000 });
      return;
    }

    try {
      const opHistoryRef = collection(db, 'opHistory');
      await addDoc(opHistoryRef, {
        opNo: formData.opNo,
        date: formData.date,
        time: formData.time,
        patientName: currentPatientStaticDetails.name || '',
        sex: currentPatientStaticDetails.sex || '',
        age: currentPatientStaticDetails.age || '',
        refDoctor: currentPatientStaticDetails.refDoctor || currentPatientStaticDetails.consultant || '',
        historyExamination: formData.historyExamination,
        investigation: formData.investigation,
        temp: formData.temp,
        pr: formData.pr,
        bp: formData.bp,
        spo2: formData.spo2,
        diagnosis: formData.diagnosis,
        reviewDate: formData.reviewDate,
        timestamp: new Date(),
      });
      toast.success('O.P. History saved successfully.', { duration: 3000 });
      await fetchOPHistory(formData.opNo);
      console.log('Setting isEditing to false after handleSave');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving O.P. History:', error);
      toast.error('Failed to save O.P. History.', { duration: 3000 });
    }
  };

  const handleEditSubmit = async () => {
    if (currentHistoryIndex === -1 || opHistoryRecords.length === 0) {
      toast.error('No history record selected to edit. Please navigate to a history entry first.', { duration: 3000 });
      return;
    }
    if (!formData.historyExamination && !formData.diagnosis && !formData.investigation) {
      toast.error('History/Examination, Investigation, or Diagnosis cannot be empty for an edited entry.', { duration: 3000 });
      return;
    }
    const recordToEdit = opHistoryRecords[currentHistoryIndex];

    try {
      const opHistoryDocRef = doc(db, 'opHistory', recordToEdit.id);
      await updateDoc(opHistoryDocRef, {
        opNo: formData.opNo,
        date: formData.date,
        time: formData.time,
        patientName: currentPatientStaticDetails.name || '',
        sex: currentPatientStaticDetails.sex || '',
        age: currentPatientStaticDetails.age || '',
        refDoctor: currentPatientStaticDetails.refDoctor || currentPatientStaticDetails.consultant || '',
        historyExamination: formData.historyExamination,
        investigation: formData.investigation,
        temp: formData.temp,
        pr: formData.pr,
        bp: formData.bp,
        spo2: formData.spo2,
        diagnosis: formData.diagnosis,
        reviewDate: formData.reviewDate,
        timestamp: new Date(),
      });
      toast.success('O.P. History updated successfully.', { duration: 3000 });
      await fetchOPHistory(formData.opNo);
      console.log('Setting isEditing to false after handleEditSubmit');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating O.P. History:', error);
      toast.error('Failed to update O.P. History.', { duration: 3000 });
    }
  };

  const handleDelete = async () => {
    if (currentHistoryIndex === -1 || opHistoryRecords.length === 0) {
      toast.error('No history record selected to delete. Please navigate to a history entry first.', { duration: 3000 });
      return;
    }
    const recordToDelete = opHistoryRecords[currentHistoryIndex];

    if (!window.confirm(`Are you sure you want to delete this history entry from ${recordToDelete.date}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'opHistory', recordToDelete.id));
      toast.success('O.P. History deleted successfully.', { duration: 3000 });
      await fetchOPHistory(formData.opNo);
      if (opHistoryRecords.length > 1) {
          loadHistoryEntry(currentHistoryIndex > 0 ? currentHistoryIndex - 1 : 0);
      } else {
          resetForm();
      }
      console.log('Setting isEditing to false after handleDelete');
      setIsEditing(false);
    } catch (error) {
      console.error('Error deleting O.P. History:', error);
      toast.error('Failed to delete O.P. History.', { duration: 3000 });
    }
  };

  const handleOk = () => {
    console.log('handleOk called');
    if (!formData.opNo) {
      toast.error('Please enter an O.P. No. to refresh data.', { duration: 3000 });
      return;
    }
    toast.success('Refreshing data...', { duration: 1500 });
    setLastFetchedOpNo(null); // Force re-fetch
    fetchPatientDetailsByOpNo(formData.opNo);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>O.P. History - Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; margin-bottom: 30px; color: #0056b3; }
            .print-section { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .print-row { display: flex; margin-bottom: 8px; border-bottom: 1px dotted #ddd; padding-bottom: 5px;}
            .print-label { font-weight: bold; width: 180px; color: #555; }
            .print-value { flex: 1; word-wrap: break-word; }
            .print-value a { color: #007bff; text-decoration: none; }
            .print-value a:hover { text-decoration: underline; }
            @media print {
                body { -webkit-print-color-adjust: exact; }
                .print-section { border: none; box-shadow: none; }
                .print-row { border-bottom: none; }
            }
          </style>
        </head>
        <body>
          <h2>O.P. History & Examination Entry</h2>
          <div class="print-section">
            <div class="print-row">
              <span class="print-label">Date:</span>
              <span class="print-value">${formData.date}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Time:</span>
              <span class="print-value">${formData.time}</span>
            </div>
            <div class="print-row">
              <span class="print-label">O.P No.:</span>
              <span class="print-value">${formData.opNo}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Patient Name:</span>
              <span class="print-value">${formData.patientName}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Sex:</span>
              <span class="print-value">${formData.sex}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Age:</span>
              <span class="print-value">${formData.age}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Ref Doctor:</span>
              <span class="print-value">${formData.refDoctor}</span>
            </div>
            <div class="print-row">
              <span class="print-label">History / Examination:</span>
              <span class="print-value">${formData.historyExamination}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Investigation:</span>
              <span class="print-value">${formData.investigation}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Temp:</span>
              <span class="print-value">${formData.temp}</span>
            </div>
            <div class="print-row">
              <span class="print-label">PR:</span>
              <span class="print-value">${formData.pr}</span>
            </div>
            <div class="print-row">
              <span class="print-label">BP:</span>
              <span class="print-value">${formData.bp}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Spo₂:</span>
              <span class="print-value">${formData.spo2}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Diagnosis:</span>
              <span class="print-value">${formData.diagnosis}</span>
            </div>
            <div class="print-row">
              <span class="print-label">Review Date:</span>
              <span class="print-value">${formData.reviewDate}</span>
            </div>
            ${patientFileUrls.length > 0 ? `
              <div class="print-row">
                <span class="print-label">Uploaded Files:</span>
                <span class="print-value">
                  ${patientFileUrls.map((url, index) => `<a href="${url}" target="_blank">File ${index + 1}</a>`).join(', ')}
                </span>
              </div>
            ` : ''}
          </div>
          <script>
            window.onload = function() {
                window.print();
                window.onafterprint = function() {
                    window.close();
                };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCancel = () => {
    toast.info('Form operation cancelled. Resetting form.', { duration: 3000 });
    resetForm();
    console.log('Setting isEditing to false in handleCancel');
    setIsEditing(false);
  };

  const handleQuit = () => {
    console.log('Quit button clicked. Navigating to dashboard.');
    navigate('/dashboard');
  };

  console.log('Rendering OPHistoryForm, isEditing:', isEditing, 'currentHistoryIndex:', currentHistoryIndex);

  return (
    <div className="background">
      <Toaster
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            border: '1px solid #fff',
            borderRadius: '8px',
            padding: '10px 20px',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
          },
          success: {
            style: {
              borderLeft: '4px solid #28a745',
            },
          },
          error: {
            style: {
              borderLeft: '4px solid #dc3545',
            },
          },
          info: {
            style: {
              borderLeft: '4px solid #17a2b8',
            },
          },
        }}
      />
      <div className="form-container">
        <h2>O.P History & Examination Entry</h2>
        <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
          <div className="form-row">
            <label>Date:</label>
            <input type="date" name="date" value={formData.date} onChange={handleInputChange} readOnly={!isEditing} />
            <label>Time:</label>
            <input type="time" name="time" value={formData.time} onChange={handleInputChange} readOnly={!isEditing} />
            <label>O.P No.:</label>
            <input
              type="text"
              name="opNo"
              value={formData.opNo}
              onChange={handleInputChange}
              readOnly={isFetching}
              placeholder="Enter O.P. No."
            />
          </div>

          <div className="form-row">
            <label>Patient Name:</label>
            <input type="text" name="patientName" value={formData.patientName} readOnly />
            <label>Sex:</label>
            <input type="text" name="sex" value={formData.sex} readOnly />
            <label>Age:</label>
            <input type="text" name="age" value={formData.age} readOnly />
            <label>Ref Doctor:</label>
            <input type="text" name="refDoctor" value={formData.refDoctor} readOnly />
          </div>

          <div className="form-row large-text-area-row">
            <label>History / Examination:</label>
            <textarea
              name="historyExamination"
              value={formData.historyExamination}
              onChange={handleInputChange}
              readOnly={!isEditing}
              rows="5"
              cols="50"
            ></textarea>
          </div>

          <div className="form-row large-text-area-row">
            <label>Investigation:</label>
            <textarea
              name="investigation"
              value={formData.investigation}
              onChange={handleInputChange}
              readOnly={!isEditing}
              rows="3"
              cols="50"
            ></textarea>
          </div>

          <div className="form-row">
            <label>Temp:</label>
            <input type="text" name="temp" value={formData.temp} onChange={handleInputChange} readOnly={!isEditing} />
            <label>PR:</label>
            <input type="text" name="pr" value={formData.pr} onChange={handleInputChange} readOnly={!isEditing} />
            <label>BP:</label>
            <input type="text" name="bp" value={formData.bp} onChange={handleInputChange} readOnly={!isEditing} />
            <label>Spo₂:</label>
            <input type="text" name="spo2" value={formData.spo2} onChange={handleInputChange} readOnly={!isEditing} />
          </div>

          <div className="form-row large-text-area-row">
            <label>Diagnosis:</label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleInputChange}
              readOnly={!isEditing}
              rows="3"
              cols="50"
            ></textarea>
          </div>

          <div className="form-row">
            <label>Review Date:</label>
            <input type="date" name="reviewDate" value={formData.reviewDate} onChange={handleInputChange} readOnly={!isEditing} />
          </div>

          {patientFileUrls.length > 0 && (
            <div className="form-row file-links-row">
              <label>Patient Files:</label>
              <div className="file-links-container">
                {patientFileUrls.map((url, index) => (
                  <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                    File {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="form-buttons">
            <button type="button" onClick={handleOk} disabled={isFetching}>OK</button>
            <button type="button" onClick={handleNew} disabled={isEditing || !formData.opNo || !currentPatientStaticDetails}>New</button>
            <button type="button" onClick={handleEdit} disabled={isEditing || currentHistoryIndex === -1}>Edit</button>

            <button
              type="button"
              onClick={() => {
                if (!formData.opNo) {
                  toast.error('Please enter an O.P. No. to view history.', { duration: 3000 });
                  return;
                }
                if (opHistoryRecords.length === 0) {
                  toast.info('No history records to display for this patient.', { duration: 3000 });
                  return;
                }
                setShowHistoryListModal(true);
              }}
              disabled={isEditing || isFetching}
            >
              View History
            </button>

            {isEditing && currentHistoryIndex === -1 && (
              <button type="button" onClick={handleSave}>Save</button>
            )}
            {isEditing && currentHistoryIndex !== -1 && (
              <button type="button" onClick={handleEditSubmit}>Save Changes</button>
            )}
            <button type="button" onClick={handleDelete} disabled={currentHistoryIndex === -1 || isEditing}>Delete</button>
            <button type="button" onClick={handlePrint}>Print</button>
            <button type="button" onClick={handleCancel}>Cancel</button>
            <button type="button" onClick={handleQuit}>Quit</button>
          </div>
        </form>
      </div>

      <HistoryListModal
        isOpen={showHistoryListModal}
        onClose={() => setShowHistoryListModal(false)}
        historyRecords={opHistoryRecords}
        onSelectHistory={(index) => {
          loadHistoryEntry(index, opHistoryRecords);
          setShowHistoryListModal(false);
        }}
      />
    </div>
  );
};

export default OPHistoryForm;