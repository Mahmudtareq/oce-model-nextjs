"use client";
import { useState } from "react";
import { createWorker } from "tesseract.js";

const MultipleOcr = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [ocrResults, setOcrResults] = useState([]);
  const [ocrStatus, setOcrStatus] = useState("");
  const [passportDataList, setPassportDataList] = useState([]);

  // Handle both single and multiple file selection
  const handleImageChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);

      // Prevent duplicate selections
      const uniqueFiles = newFiles.filter(
        (newFile) => !selectedImages.some((file) => file.name === newFile.name)
      );

      setSelectedImages((prevImages) => [...prevImages, ...uniqueFiles]);
    }
  };

  // Remove selected image
  const removeImage = (index) => {
    setSelectedImages((prevImages) =>
      prevImages.filter((_, item) => item !== index)
    );
  };

  // Perform OCR on multiple images
  const readImageText = async () => {
    if (selectedImages.length === 0) return;

    setOcrStatus("Processing...");
    const worker = await createWorker("eng");

    try {
      const results = [];
      const passportDataArray = [];

      for (const image of selectedImages) {
        const {
          data: { text },
        } = await worker.recognize(image);

        results.push(text);
        const extractedData = extractPassportData(text);
        passportDataArray.push(extractedData);
      }

      setOcrResults(results);
      setPassportDataList(passportDataArray);
      setOcrStatus("Completed");
    } catch (error) {
      console.error(error);
      setOcrStatus("Error occurred during processing.");
    } finally {
      await worker.terminate();
    }
  };

  // Extract passport details from MRZ
  const extractPassportData = (text) => {
    const mrzLines = text
      .split("\n")
      .map((line) => line.trim()) // Remove extra spaces
      .filter((line) => line.includes("<<") || line.match(/^\d{9}[A-Z]/));

    if (mrzLines.length < 2) {
      return { error: "MRZ section not detected properly." };
    }

    // Extract MRZ lines
    const line1 = mrzLines[0].replace(/\s/g, ""); // Remove spaces
    const line2 = mrzLines[1].replace(/\s/g, "");

    // **Extract Name (Surname + Given Name)**
    const nameParts = line1.split("<<");

    // Fix Surname Extraction: Remove dynamic country code
    const surname = nameParts[0].replace(/^P<([A-Z]{3})/, "").trim(); // Removes "P<BGD"

    // Fix Given Name Extraction: Keep full name, remove unwanted characters
    const givenName = nameParts[1]
      ?.replace(/<+/g, " ") // Replace multiple '<' with a space
      .replace(/[^A-Za-z ]/g, "") // Remove non-alphabet characters
      .trim()
      .split(" ")[0];

    // **Extract MRZ Line 2 Details**
    const passportNumber = line2.substring(0, 9);
    const nationality = line2.substring(10, 13);
    const dateOfBirth = formatDate(line2.substring(13, 19));
    const gender = line2.substring(20, 21);
    const expiryDate = formatDate(line2.substring(21, 27));

    // **Extract Issue Date from Text**
    let issueDate = "Not found";
    const issueDateMatch = text.match(/\b\d{2} [A-Za-z]{3} \d{4}\b/g);

    // Improved logic: Search for "Date of Issue" near detected dates
    if (issueDateMatch) {
      for (let i = 0; i < issueDateMatch.length - 1; i++) {
        if (text.includes("Date of Issue") || text.includes("Issued on")) {
          issueDate = issueDateMatch[i];
          break;
        }
      }
    }

    return {
      PassportNumber: passportNumber || "Not found",
      Surname: surname || "Not found",
      GivenName: givenName || "Not found",
      Nationality: nationality || "Not found",
      DateOfBirth: dateOfBirth || "Not found",
      Gender: gender || "Not found",
      ExpiryDate: expiryDate || "Not found",
      IssueDate: issueDate,
    };
  };

  // Convert YYMMDD to DD-MM-YYYY format
  const formatDate = (yyMMdd) => {
    if (!yyMMdd.match(/\d{6}/)) return "Not found";
    const year = `20${yyMMdd.substring(0, 2)}`;
    const month = yyMMdd.substring(2, 4);
    const day = yyMMdd.substring(4, 6);
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="p-5 bg-gray-50 min-h-screen">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
        className="mb-4 p-2 border border-gray-300 rounded-md"
      />

      {selectedImages.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {selectedImages.map((image, index) => (
            <div key={index} className="relative inline-block">
              <img
                src={URL.createObjectURL(image)}
                alt={`Uploaded ${index + 1}`}
                className="w-36 rounded-lg shadow-md"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={readImageText}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Submit
        </button>
      </div>

      <p className="mt-4 font-bold text-gray-700">Status:</p>
      <p className="text-gray-600">{ocrStatus}</p>

      <h3 className="mt-4 font-bold text-gray-800">Extracted Passport Data:</h3>
      <div className="grid lg:grid-cols-3 grid-cols-1 gap-4">
        {passportDataList.length > 0 ? (
          passportDataList.map((passportData, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 bg-gray-100 shadow-md mt-3"
            >
              <p>
                📌 <b>Passport Number:</b> {passportData.PassportNumber}
              </p>
              <p>
                👤 <b>First Name:</b> {passportData.GivenName}
              </p>
              <p>
                👤 <b>Surname:</b> {passportData.Surname}
              </p>
              <p>
                🌍 <b>Nationality:</b> {passportData.Nationality}
              </p>
              <p>
                🎂 <b>Date of Birth:</b> {passportData.DateOfBirth}
              </p>
              <p>
                📅 <b>Issue Date:</b> {passportData.IssueDate}
              </p>
              <p>
                ⌛ <b>Expiry Date:</b> {passportData.ExpiryDate}
              </p>
              <p>
                ⚤ <b>Gender:</b> {passportData.Gender}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No passport data found.</p>
        )}
      </div>
    </div>
  );
};

export default MultipleOcr;
