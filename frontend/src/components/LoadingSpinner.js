// // src/components/LoadingSpinner.js
// import React from 'react';

// const LoadingSpinner = ({ message = "Loading..." }) => {
//   return (
//     <div className="flex flex-col items-center justify-center py-8">
//       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
//       <p className="mt-4 text-gray-700">{message}</p>
//     </div>
//   );
// };

// export default LoadingSpinner;




// src/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      <p className="mt-4 text-gray-700">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
