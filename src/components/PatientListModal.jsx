// src/PatientListModal.js
import React from 'react';
import './PatientListModal.css';

// Added actionType prop
const PatientListModal = ({ patients, isOpen, onClose, onSelectPatient, actionType }) => {
  if (!isOpen) return null;

  const buttonText = actionType === 'remove' ? 'Select to Remove' : 'Select';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Changed heading based on actionType */}
        <h3>{actionType === 'remove' ? 'Select Patient to Remove' : 'Select Patient to Edit'}</h3>
        <div className="patient-list-table-container">
          <table className="patient-list-table">
            <thead>
              <tr>
                <th>OP No.</th>
                <th>Reg No.</th>
                <th>Name</th>
                <th>Sex</th>
                <th>Age</th>
                <th>Consultant</th>
                <th>Date</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.opNo}</td>
                    <td>{patient.regNo}</td>
                    <td>{patient.name}</td>
                    <td>{patient.sex}</td>
                    <td>{patient.age}</td>
                    <td>{patient.consultant}</td>
                    <td>{patient.date}</td>
                    <td>{patient.time}</td>
                    <td>
                      {/* Button text changes based on actionType */}
                      <button className="select-button" onClick={() => onSelectPatient(patient, actionType)}>
                        {buttonText}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9">No patients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button className="close-modal-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default PatientListModal;