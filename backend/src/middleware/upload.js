import multer from "multer";

const MAX_POLICY_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const validatePrivacyPolicyPdfFile = (file) => {
  return (
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf")
  );
};

export const uploadPrivacyPolicy = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_POLICY_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    if (!validatePrivacyPolicyPdfFile(file)) {
      const error = new Error("Only PDF files are allowed");
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  },
});

export { MAX_POLICY_FILE_SIZE_BYTES };
