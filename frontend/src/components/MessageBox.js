// src/components/MessageBox.js
import React from 'react';

const MessageBox = ({ message, type = 'info', onConfirm, onCancel, showCancel = false }) => {
  const bgColor = {
    info: 'bg-blue-100 border-blue-400 text-blue-700',
    success: 'bg-green-100 border-green-400 text-green-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    error: 'bg-red-100 border-red-400 text-red-700',
  }[type];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl p-6 max-w-sm w-full border ${bgColor}`}>
        <p className="text-lg font-semibold mb-4 text-center">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            OK
          </button>
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 rounded-md bg-gray-300 text-gray-800 font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
