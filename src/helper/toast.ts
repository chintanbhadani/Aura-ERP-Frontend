import { toast } from "react-toastify";

export const successToast = (message: string) => {
  return toast.success(message, {
    autoClose: 5000, // Adjust the time as needed
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    closeButton: true, // Ensure closeButton is enabled
    style: {
      borderBottom: "none",
    },
  });
};

export const errorToast = (message: string) => {
  return toast.error(message, {
    autoClose: 3000, // Adjust the time as needed
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    closeButton: true, // Ensure closeButton is enabled
    style: {
      borderBottom: "none",
    },
  });
};
