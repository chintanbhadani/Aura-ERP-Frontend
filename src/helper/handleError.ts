import type { NavigateFunction } from "react-router-dom";
import type { AxiosCustomError } from "./fe.interface";
import { errorToast } from "./toast";

export const errorHandler = (
  error: AxiosCustomError,
  router?: NavigateFunction
) => {
  const { response } = error;

  let message = "Something went wrong, Please try again later";

  if (response?.status === 401) {
    if (response.data && response.data.message) message = response.data.message;
    router?.("/", { replace: true });
  } else if (response) {
    if (response.data && response.data.message) message = response.data.message;
  }

  errorToast(message);
};

export const errorHandlerForFetch = (
  error: AxiosCustomError,
  setErrorState?: React.Dispatch<React.SetStateAction<string>>
) => {
  const { response } = error;

  let message = "Something went wrong, Please try again later";

  if (response && response.data && response.data.message) {
    message = response.data.message;
  }

  if (setErrorState) setErrorState(message);

  return message;
};
