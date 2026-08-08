import pdfParse from "pdf-parse";

export const extractPdfText = async (buffer) => {
  const data = await pdfParse(buffer);
  return data.text.trim();
};
