// src/components/ToastProvider.jsx (New separate component for toast setup)
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastProvider = () => {
  return (
    <ToastContainer 
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
      limit={3}
      toastClassName="custom-toast bg-gray-800 border border-blue-500 text-white"
    />
  );
};

export default ToastProvider;