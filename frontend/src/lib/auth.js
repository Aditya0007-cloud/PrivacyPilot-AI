export const getDashboardPath = (role) => {
  if (role === "company") {
    return "/company/dashboard";
  }

  return "/user/dashboard";
};

export const getApiErrorMessage = (error, fallback = "Something went wrong") => {
  return error?.response?.data?.message || fallback;
};
