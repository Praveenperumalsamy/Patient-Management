import React, { useState, useEffect, useCallback } from 'react';
import './PatientDetails.css'; // Ensure PatientDetails.css is in the same directory as this file.
import { db } from '../Firebase.js'; // Check your Firebase config file is named Firebase.js or Firebase.jsx in the parent directory.
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import PatientListModal from '../components/PatientListModal.jsx'; // Check your modal component is named PatientListModal.jsx or PatientListModal.js in the same directory.
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dcxsdc1p0/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

const PatientDetails = () => {
  const [formData, setFormData] = useState({
    opNo: "",
    regNo: "",
    name: "",
    sex: "",
    maritalStatus: "",
    spouseName: "",
    dob: "",
    age: "",
    address: "",
    temp: "",
    pr: "",
    bp: "",
    spo2: "",
    consultant: "",
    allergy: "",
    email: "",
    operatorName: "",
    refDoctor: "",
    bloodGroup: "",
    files: [], // Changed to an array for multiple files
    date: "",
    time: "",
  });

  const [patients, setPatients] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  // 'view': form is read-only for existing patients
  // 'new': form is editable for a new patient entry
  // 'edit': form is editable for an existing patient
  const [mode, setMode] = useState('view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null); // New state to determine modal action

  // New states for custom delete confirmation
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);

  const navigate = useNavigate(); // Initialize useNavigate hook for navigation

  useEffect(() => {
    console.log('PatientDetails mounted');
    return () => {
      console.log('PatientDetails unmounted');
    };
  }, []);

  const getCurrentDateTime = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const formattedTime = now.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' }); // HH:MM
    return { formattedDate, formattedTime };
  };

  useEffect(() => {
    fetchPatients();
    const { formattedDate, formattedTime } = getCurrentDateTime();
    setFormData((prev) => ({
      ...prev,
      date: formattedDate,
      time: formattedTime,
    }));
  }, []);

  const fetchPatients = async () => {
    try {
      const q = query(collection(db, "patients"), orderBy("timestamp", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        opNo: doc.data().opNo || "",
        regNo: doc.data().regNo || "",
        name: doc.data().name || "",
        sex: doc.data().sex || "",
        maritalStatus: doc.data().maritalStatus || "",
        spouseName: doc.data().spouseName || "",
        dob: doc.data().dob || "",
        age: doc.data().age || "",
        address: doc.data().address || "",
        temp: doc.data().temperature || doc.data().temp || "",
        pr: doc.data().pulse || doc.data().pr || "",
        bp: doc.data().bp || "",
        spo2: doc.data().spo2 || "",
        consultant: doc.data().consultant || "",
        allergy: doc.data().allergy || "",
        email: doc.data().email || "",
        operatorName: doc.data().operatorName || "",
        refDoctor: doc.data().refDoctor || "",
        bloodGroup: doc.data().bloodGroup || "",
        files: doc.data().files || (doc.data().file ? [doc.data().file] : []), // Handle existing 'file' as a single-element array for backward compatibility
        date: doc.data().date || "",
        time: doc.data().time || "",
        timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date(0), // Convert Firebase Timestamp to Date object, default to epoch for safety
      }));
      setPatients(data);

      // Only load first patient if not already in 'new' or 'edit' mode
      if (mode === 'view') { // If it's 'edit' mode, we preserve the current form data
        if (data.length > 0) {
          setFormData({ ...data[0], files: data[0].files || [] });
          setCurrentIndex(0);
        } else {
          setCurrentIndex(-1);
          clearForm(); // Clear form if no patients
        }
      } else if (mode === 'edit' && currentIndex !== -1 && patients[currentIndex]) {
        // If in edit mode and the current patient exists in the refetched list, re-apply their data.
        // This helps if data was changed externally or the current patient was deleted.
        const updatedPatient = data.find(p => p.id === patients[currentIndex].id);
        if (updatedPatient) {
          setFormData({ ...updatedPatient, files: updatedPatient.files || [] });
          setCurrentIndex(data.indexOf(updatedPatient));
        } else {
          // If the patient being edited was deleted, clear form and go to view mode.
          clearForm();
          toast.info("Patient being edited was removed by another user or session.", {duration: 3000});
        }
      }
      // setMode('view'); // Not always revert to view mode after fetching, depends on current mode
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Failed to fetch patient data.", { duration: 3000 });
    }
  };

  const hasUnsavedChanges = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= patients.length) {
      // If no patient loaded or invalid index, and it's not 'new' mode, no unsaved changes.
      if (mode !== 'new') return false;
      // In 'new' mode, consider changes if basic fields are filled
      return !!formData.name || !!formData.opNo || !!formData.regNo || formData.files.length > 0;
    }

    const currentPatient = patients[currentIndex];
    const currentFormDataComparable = { ...formData };

    // Filter out File objects from formData for comparison, keep URLs
    const currentFormFiles = currentFormDataComparable.files.filter(f => typeof f === 'string');
    // Track if any new files (File objects) have been added
    const newFilesAdded = currentFormDataComparable.files.some(f => f instanceof File);

    // Compare simple fields
    const fieldsChanged = (
      currentFormDataComparable.opNo !== currentPatient.opNo ||
      currentFormDataComparable.regNo !== currentPatient.regNo ||
      currentFormDataComparable.name !== currentPatient.name ||
      currentFormDataComparable.sex !== currentPatient.sex ||
      currentFormDataComparable.maritalStatus !== currentPatient.maritalStatus ||
      currentFormDataComparable.spouseName !== currentPatient.spouseName ||
      currentFormDataComparable.dob !== currentPatient.dob ||
      currentFormDataComparable.age !== currentPatient.age ||
      currentFormDataComparable.address !== currentPatient.address ||
      currentFormDataComparable.temp !== (currentPatient.temperature || currentPatient.temp) ||
      currentFormDataComparable.pr !== (currentPatient.pulse || currentPatient.pr) ||
      currentFormDataComparable.bp !== currentPatient.bp ||
      currentFormDataComparable.spo2 !== currentPatient.spo2 ||
      currentFormDataComparable.consultant !== currentPatient.consultant ||
      currentFormDataComparable.allergy !== currentPatient.allergy ||
      currentFormDataComparable.email !== currentPatient.email ||
      currentFormDataComparable.operatorName !== currentPatient.operatorName ||
      currentFormDataComparable.refDoctor !== currentPatient.refDoctor ||
      currentFormDataComparable.bloodGroup !== currentPatient.bloodGroup
    );

    // Compare files:
    // 1. Check if the number of files changed
    // 2. Check if the set of file URLs changed (order doesn't matter for content equality)
    const currentPatientFiles = Array.isArray(currentPatient.files) ? currentPatient.files : (currentPatient.file ? [currentPatient.file] : []); // Handle legacy 'file' field
    const fileUrlsChanged =
      newFilesAdded || // If new files are present, there are unsaved changes
      currentFormFiles.length !== currentPatientFiles.length ||
      !currentFormFiles.every(url => currentPatientFiles.includes(url)) || // Check if all current form URLs exist in patient files
      !currentPatientFiles.every(url => currentFormFiles.includes(url)); // Check if all patient files exist in current form URLs

    return fieldsChanged || fileUrlsChanged;
  }, [formData, currentIndex, patients, mode]);


  const calculateAge = (dobString) => {
    if (!dobString) return "";
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "files" && files) { // Handle the specific 'files' input
      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...Array.from(files)], // Add new files to the existing array
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDobChange = (e) => {
    const dobValue = e.target.value;
    const calculatedAge = calculateAge(dobValue);
    setFormData((prev) => ({
      ...prev,
      dob: dobValue,
      age: calculatedAge,
    }));
  };

  const clearForm = () => {
    const { formattedDate, formattedTime } = getCurrentDateTime();
    setFormData({
      opNo: "",
      regNo: "",
      name: "",
      sex: "",
      maritalStatus: "",
      spouseName: "",
      dob: "",
      age: "",
      address: "",
      temp: "",
      pr: "",
      bp: "",
      spo2: "",
      consultant: "",
      allergy: "",
      email: "",
      operatorName: "",
      refDoctor: "",
      bloodGroup: "",
      files: [], // Clear files array
      date: formattedDate,
      time: formattedTime,
    });
    setCurrentIndex(-1);
    setMode('view'); // Always return to view mode after clearing
  };

  // New function to remove a single file from the formData.files array
  const removeFile = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove),
    }));
    toast.info('File removed from selection. Save changes to confirm.', { duration: 2000 });
  };


  const uploadToCloudinary = async (filesToUpload) => {
    const uploadedUrls = [];
    const allowed = [
      "image/jpeg", "image/png", "application/pdf",
      "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-flv", "video/mpeg", "video/ogg", "video/x-ms-wmv"
    ];

    for (const file of filesToUpload) {
      if (!allowed.includes(file.type)) {
        toast.error(`File "${file.name}" is not a supported type. Only JPG, PNG, PDF, or common video formats allowed.`, { duration: 4000 });
        continue; // Skip this file and try the next one
      }

      const cloudData = new FormData();
      cloudData.append("file", file);
      cloudData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      try {
        const res = await axios.post(CLOUDINARY_URL, cloudData);
        uploadedUrls.push(res.data.secure_url);
        toast.success(`File "${file.name}" uploaded successfully!`, { duration: 1500 });
      } catch (err) {
        console.error(`Cloudinary upload error for ${file.name}:`, err);
        toast.error(`File "${file.name}" upload failed. Please check console for details.`, { duration: 3000 });
      }
    }
    return uploadedUrls;
  };

  const handleSave = async () => {
    if (mode !== 'new') {
      toast.error("Form is not in 'New Entry' mode to save.", { duration: 3000 });
      return;
    }
    if (!formData.name || !formData.opNo || !formData.regNo) {
      toast.error("Name, O.P. No., and Reg. No. are required to save a new patient.", { duration: 3000 });
      return;
    }

    try {
      let uploadedFileUrls = [];
      const filesToUpload = formData.files.filter(f => f instanceof File); // Only upload new File objects

      if (filesToUpload.length > 0) {
        uploadedFileUrls = await uploadToCloudinary(filesToUpload);
        if (uploadedFileUrls.length !== filesToUpload.length) {
          toast.warn("Some files could not be uploaded. Patient will be saved with available files.", { duration: 5000 });
        }
      }

      await addDoc(collection(db, "patients"), {
        ...formData,
        files: uploadedFileUrls, // Save the array of uploaded URLs
        timestamp: new Date(), // Ensure timestamp is set on creation
      });

      toast.success("Patient saved successfully.", { duration: 3000 });
      clearForm(); // Clear form and switch to view mode
      fetchPatients(); // Re-fetch to update the list and potentially load the newly added patient
    } catch (err) {
      console.error("Save patient error:", err);
      toast.error("Save failed. Please check console for details.", { duration: 3000 });
    }
  };

  const handleOpenEditModal = () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation before editing.', { duration: 3000 });
      return;
    }
    setActionType('edit');
    setIsModalOpen(true);
  };

  const handleOpenRemoveModal = () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation before removing.', { duration: 3000 });
      return;
    }
    setActionType('remove');
    setIsModalOpen(true);
  };

  const handleSelectPatientFromModal = async (selectedPatient, type) => {
    setIsModalOpen(false); // Close the modal first

    if (type === 'edit') {
      setFormData({ ...selectedPatient, files: selectedPatient.files || [] });
      const index = patients.findIndex(p => p.id === selectedPatient.id);
      setCurrentIndex(index);
      setMode('edit'); // Set mode to 'edit'
      toast.success(`Patient "${selectedPatient.name}" loaded for editing.`, { duration: 2000 });
    } else if (type === 'remove') {
      setPatientToDelete(selectedPatient); // Store patient to delete
      setShowConfirmDeleteModal(true);    // Show confirmation modal
    }
    setActionType(null); // Reset action type
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return; // Should not happen if modal is shown correctly

    try {
      await deleteDoc(doc(db, "patients", patientToDelete.id));
      toast.success("Patient deleted successfully.", { duration: 3000 });
      clearForm(); // Clear form and switch to view mode
      fetchPatients(); // Re-fetch to update the list
    } catch (err) {
      console.error("Delete patient error:", err);
      toast.error("Deletion failed. Please check console for details.", { duration: 3000 });
    } finally {
      setPatientToDelete(null); // Clear patient to delete
      setShowConfirmDeleteModal(false); // Hide confirmation modal
    }
  };

  const handleCancelDelete = () => {
    toast('Deletion cancelled.', { icon: 'ℹ️' });
    setPatientToDelete(null);
    setShowConfirmDeleteModal(false);
    setMode('view'); // Ensure we are back in view mode
  };


  const handleUpdatePatient = async () => {
    if (mode !== 'edit' || currentIndex < 0) {
      toast.error("Form is not in 'Edit' mode or no patient is selected for update.", { duration: 3000 });
      return;
    }
    if (!formData.name || !formData.opNo || !formData.regNo) {
      toast.error("Name, O.P. No., and Reg. No. are required to update a patient.", { duration: 3000 });
      return;
    }

    try {
      let finalFileUrls = [];
      const filesToUpload = formData.files.filter(f => f instanceof File); // Files that are new and need uploading
      const retainedUrls = formData.files.filter(f => typeof f === 'string'); // URLs of existing files that were kept

      if (filesToUpload.length > 0) {
        const uploadedNewUrls = await uploadToCloudinary(filesToUpload);
        if (uploadedNewUrls.length !== filesToUpload.length) {
          toast.warn("Some new files failed to upload during update.", { duration: 5000 });
        }
        finalFileUrls = [...retainedUrls, ...uploadedNewUrls];
      } else {
        finalFileUrls = retainedUrls; // No new files, just use the retained URLs
      }

      const patient = patients[currentIndex]; // Get the original patient object to find its ID
      const docRef = doc(db, "patients", patient.id);
      const dataToUpdate = { ...formData };
      delete dataToUpdate.files; // Ensure we don't save File objects directly

      await updateDoc(docRef, {
        ...dataToUpdate,
        files: finalFileUrls, // Use the updated/retained array of file URLs
        timestamp: new Date(), // Ensure timestamp is updated on modification
      });

      toast.success("Patient details updated successfully.", { duration: 3000 });
      setMode('view'); // Return to view mode after update
      fetchPatients(); // Re-fetch to update the list and reflect changes
    } catch (err) {
      console.error("Update patient error:", err);
      toast.error("Update failed. Please check console for details.", { duration: 3000 });
    }
  };

  const navigateTo = (index, message) => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation before navigating.', { duration: 3000 });
      return;
    }
    if (index >= 0 && index < patients.length) {
      setFormData({ ...patients[index], files: patients[index].files || [] });
      setCurrentIndex(index);
      setMode('view'); // Ensure always in view mode after navigation
      if (message) {
        toast.info(message, { duration: 1500 });
      }
    } else {
      toast.error("Navigation not possible.", { duration: 1500 });
    }
  };

  // NEW FUNCTION FOR LAST PATIENT
  const handleLastPatient = () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation before navigating.', { duration: 3000 });
      return;
    }
    if (patients.length === 0) {
      toast.info("No patients to display.", { duration: 2000 });
      return;
    }
    const lastIndex = patients.length - 1;
    const lastPatient = patients[lastIndex];
    setFormData({ ...lastPatient, files: lastPatient.files || [] });
    setCurrentIndex(lastIndex);
    setMode('view'); // Ensure always in view mode after navigation
    toast.success(`Showing most recent patient: ${lastPatient.name} (OP No: ${lastPatient.opNo})`, { duration: 2000 });
  };

  const handleNewEntry = () => {
    if (mode === 'new' || mode === 'edit') {
      toast.info('Already in a new entry or edit mode. Please save or cancel first.', { duration: 3000 });
      return;
    }
    clearForm(); // Clears form and sets mode to 'view' first.
    setMode('new'); // Then explicitly set mode to 'new'

    let maxOp = 0;
    let maxReg = 0;

    // Find max OP and Reg numbers from fetched patients
    patients.forEach((p) => {
      const op = parseInt(p.opNo);
      const reg = parseInt(p.regNo);
      if (!isNaN(op) && op > maxOp) maxOp = op;
      if (!isNaN(reg) && reg > maxReg) maxReg = reg;
    });

    const { formattedDate, formattedTime } = getCurrentDateTime();

    setFormData((prev) => ({
      ...prev,
      opNo: (maxOp + 1).toString(),
      regNo: (maxReg + 1).toString(),
      date: formattedDate,
      time: formattedTime,
    }));

    toast.success("New patient initialized with next available OP/Reg No.", { duration: 3000 });
  };

  // Function to handle quitting the form and navigating to the dashboard
  const handleQuit = () => {
    if (mode === 'new' || mode === 'edit') {
      toast.error('Please save or cancel current operation before quitting.', { duration: 3000 });
      return;
    }
    console.log('Quit button clicked. Navigating to dashboard.');
    navigate('/dashboard'); // Navigate to the dashboard route
  };

  const handleCancel = () => {
    if (mode === 'new') {
      // If in new mode, clear and go back to view
      clearForm();
      toast.info('New entry cancelled.', { duration: 2000 });
    } else if (mode === 'edit') {
      // If in edit mode, revert to original patient data and go to view
      if (currentIndex !== -1 && patients[currentIndex]) {
        setFormData({ ...patients[currentIndex], files: patients[currentIndex].files || [] });
        setMode('view');
        toast.info('Edit cancelled. Changes discarded.', { duration: 2000 });
      } else {
        clearForm(); // Fallback if index is somehow invalid
        toast.info('Edit cancelled. Form cleared.', { duration: 2000 });
      }
    } else {
      // If in view mode, no specific action, maybe just a toast
      toast.info('No active operation to cancel.', { duration: 2000 });
    }
  };


  return (
    <div className="patient-details-page">
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
          warn: { // Added warning style
            style: {
              borderLeft: '4px solid #ffc107',
            },
          },
        }}
      />
      <div className="patient-details-container">
        <div className="form-section">
          <form className="patient-form">
            <div className="form-row">
              <label>Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} readOnly={mode === 'view'} />
              <label>Time</label>
              <input type="time" name="time" value={formData.time} onChange={handleInputChange} readOnly={mode === 'view'} />
            </div>

            <div className="form-row">
              <label>OP No.</label>
              {/* OP No. is editable only for new entries */}
              <input type="text" name="opNo" value={formData.opNo} onChange={handleInputChange} readOnly={mode !== 'new'} />
              <label>Reg No.</label>
              {/* Reg No. is editable only for new entries */}
              <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} readOnly={mode !== 'new'} />
            </div>

            <div className="form-row">
              <label>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} readOnly={mode === 'view'} />
              <label>Sex</label>
              <select name="sex" value={formData.sex} onChange={handleInputChange} disabled={mode === 'view'}> {/* Changed to disabled */}
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div className="form-row">
              <label>Marital Status</label>
              <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} disabled={mode === 'view'}> {/* Changed to disabled */}
                <option value="">Select</option>
                <option>Married</option>
                <option>Unmarried</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </select>
              {formData.maritalStatus === "Married" && (
                <>
                  <label>Spouse Name</label>
                  <input
                    type="text"
                    name="spouseName"
                    value={formData.spouseName}
                    onChange={handleInputChange}
                    readOnly={mode === 'view'}
                  />
                </>
              )}
            </div>

            <div className="form-row">
              <label>DOB</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleDobChange}
                readOnly={mode === 'view'}
              />
              <label>Age</label>
              <input
                type="text"
                name="age"
                value={formData.age}
                readOnly // Age is always read-only as it's derived
              />
            </div>

            <div className="form-row">
              <label>Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleInputChange} readOnly={mode === 'view'} />
            </div>

            <div className="form-row">
              <label>Temp</label>
              <input type="text" name="temp" value={formData.temp} onChange={handleInputChange} readOnly={mode === 'view'} />
              <label>PR</label>
              <input type="text" name="pr" value={formData.pr} onChange={handleInputChange} readOnly={mode === 'view'} />
              <label>BP</label>
              <input type="text" name="bp" value={formData.bp} onChange={handleInputChange} readOnly={mode === 'view'} />
              <label>Spo₂</label>
              <input type="text" name="spo2" value={formData.spo2} onChange={handleInputChange} readOnly={mode === 'view'} />
            </div>

            <div className="form-row">
              <label>Consultant</label>
              <input type="text" name="consultant" value={formData.consultant} onChange={handleInputChange} readOnly={mode === 'view'} />
              <label>Allergy</label>
              <input type="text" name="allergy" value={formData.allergy} onChange={handleInputChange} readOnly={mode === 'view'} />
            </div>

            <div className="form-row">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} readOnly={mode === 'view'} />
              <label>Operator</label>
              <input type="text" name="operatorName" value={formData.operatorName} onChange={handleInputChange} readOnly={mode === 'view'} />
            </div>

            <div className="form-row">
              <label>Ref Doctor</label>
              <input type="text" name="refDoctor" value={formData.refDoctor} onChange={handleInputChange} readOnly={mode === 'view'} />
              <label>Blood Group</label>
              <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} readOnly={mode === 'view'} />
            </div>

            <div className="form-row file-upload-section">
              <label>Upload Files</label>
              <input
                type="file"
                name="files" // Changed name to 'files'
                onChange={handleInputChange}
                disabled={mode === 'view'}
                accept="image/*,application/pdf,video/*"
                multiple // Added multiple attribute
              />
              {formData.files && formData.files.length > 0 && (
                <div className="uploaded-files-preview">
                  <h4>Uploaded/Selected Files:</h4>
                  <ul>
                    {formData.files.map((file, index) => (
                      <li key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        {typeof file === 'string' ? (
                          // Existing file (URL)
                          <>
                            {file.match(/\.(jpeg|jpg|png)$/i) ? (
                              <a href={file} target="_blank" rel="noopener noreferrer">View Image {index + 1}</a>
                            ) : file.match(/\.pdf$/i) ? (
                              <a href={file} target="_blank" rel="noopener noreferrer">View PDF {index + 1}</a>
                            ) : file.match(/\.(mp4|webm|mov|avi|flv|mpeg|ogg|wmv)$/i) ? (
                              <a href={file} target="_blank" rel="noopener noreferrer">View Video {index + 1}</a>
                            ) : (
                              <a href={file} target="_blank" rel="noopener noreferrer">View File {index + 1}</a>
                            )}
                            {(mode === 'new' || mode === 'edit') && (
                                <button type="button" onClick={() => removeFile(index)}
                                    style={{ marginLeft: '10px', padding: '3px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8em' }}>
                                    Remove
                                </button>
                            )}
                          </>
                        ) : (
                          // Newly selected file (File object)
                          <span style={{ fontStyle: 'italic' }}>
                            {file.name} (New)
                            {(mode === 'new' || mode === 'edit') && (
                                <button type="button" onClick={() => removeFile(index)}
                                    style={{ marginLeft: '10px', padding: '3px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8em' }}>
                                    Remove
                                </button>
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="sidebar-buttons">
          <button onClick={handleNewEntry} disabled={mode === 'new' || mode === 'edit'}>New</button>
          {mode === 'new' ? (
            <button onClick={handleSave} disabled={!formData.name || !formData.opNo || !formData.regNo}>Save</button>
          ) : (
            <button onClick={handleUpdatePatient} disabled={mode !== 'edit' || currentIndex < 0 || !hasUnsavedChanges()}>Save Changes</button>
          )}

          <button onClick={handleOpenEditModal} disabled={mode !== 'view' || patients.length === 0}>Edit</button>
          <button onClick={handleOpenRemoveModal} disabled={mode !== 'view' || patients.length === 0}>Remove</button>

          {/* Navigation Buttons with Toast Messages */}
          <button onClick={() => navigateTo(0, "Showing first patient.")} disabled={mode !== 'view' || patients.length === 0}>First</button>
          <button onClick={() => navigateTo(currentIndex - 1, "Showing previous patient.")} disabled={mode !== 'view' || currentIndex <= 0 || patients.length === 0}>Prev</button>
          <button onClick={() => navigateTo(currentIndex + 1, "Showing next patient.")} disabled={mode !== 'view' || currentIndex >= patients.length - 1 || patients.length === 0}>Next</button>
          {/* Last button now calls the dedicated handleLastPatient function */}
          <button onClick={handleLastPatient} disabled={mode !== 'view' || patients.length === 0}>Last</button>

          <button onClick={fetchPatients} disabled={mode !== 'view'}>Ok</button>
          <button onClick={handleCancel} disabled={mode === 'view'}>Cancel</button>
          {/* Quit button for navigation to dashboard */}
          <button
            type="button"
            onClick={handleQuit}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d', /* A subtle grey for Quit */
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#5a6268'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#6c757d'}
            disabled={mode !== 'view'} // Disable quit button if in edit/new mode
          >
            Quit
          </button>
        </div>
      </div>

      <PatientListModal
        patients={patients}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectPatient={handleSelectPatientFromModal}
        actionType={actionType}
      />

      {/* Custom Delete Confirmation Modal */}
      {showConfirmDeleteModal && patientToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ color: '#dc3545', marginBottom: '20px' }}>Confirm Deletion</h3>
            <p style={{ marginBottom: '25px', fontSize: '1.1em' }}>
              Are you sure you want to delete patient "<strong>{patientToDelete.name}</strong>" (OP No: {patientToDelete.opNo})?
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '15px' }}>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  flex: 1,
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#c82333'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#dc3545'}
              >
                Yes, Delete
              </button>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  flex: 1,
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#5a6268'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#6c757d'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;