"use client";
import { useState } from "react";
import { createWorker } from "tesseract.js";

const OcrComponent = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [passportData, setPassportData] = useState(null);

  // Handle file selection
  const handleImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
      setOcrResult("");
      setOcrStatus("");
      setPassportData(null);
    }
  };

  // Perform OCR
  const readImageText = async () => {
    if (!selectedImage) return;

    setOcrStatus("Processing...");

    const worker = await createWorker("eng");

    try {
      const {
        data: { text },
      } = await worker.recognize(selectedImage);

      setOcrResult(text);
      setOcrStatus("Completed");

      // Extract structured data from the MRZ section
      const extractedData = extractPassportData(text);
      console.log("extractedData", extractedData);
      setPassportData(extractedData);
    } catch (error) {
      console.error(error);
      setOcrStatus("Error occurred during processing.");
    } finally {
      await worker.terminate();
    }
  };

  // Function to extract passport details from MRZ
  const extractPassportData = (text) => {
    const mrzLines = text
      .split("\n")
      .filter((line) => line.includes("<<") || line.match(/\d{9}[A-Z]/));

    if (mrzLines.length < 2) {
      return { error: "MRZ section not detected properly." };
    }

    const line1 = mrzLines[0].replace(/\s/g, ""); // Remove spaces
    const line2 = mrzLines[1].replace(/\s/g, "");

    // Properly extract surname and given name
    const nameParts = line1.split("<<");

    // Correct Surname extraction (Remove "P<" and "BGD" dynamically)
    const surname = nameParts[0].replace(/^P<[A-Z]{3}/, ""); // Removes "P<BGD"

    // Correct Given Name extraction (Remove "<" and unwanted characters)
    const givenName = nameParts[1]
      .replace(/<+/g, " ") // Replace multiple "<" with space
      .replace(/[^A-Za-z ]/g, "") // Remove unexpected characters
      .trim(); // Trim spaces

    // Extract issue date using RegEx from the standard text
    const issueDateMatch = text.match(/\b\d{2} [A-Za-z]{3} \d{4}\b/g);

    // Ensure we get the correct issue date (not DOB or Expiry Date)
    let issueDate = "Not found";
    if (issueDateMatch && issueDateMatch.length >= 3) {
      issueDate = issueDateMatch[1]; // The 2nd date is usually the issue date
    }

    return {
      PassportNumber: line2.substring(0, 9), // First 9 characters
      Surname: surname,
      GivenName: givenName,
      Nationality: line2.substring(10, 13), // 3-letter country code
      DateOfBirth: formatDate(line2.substring(13, 19)), // DOB in YYMMDD
      Gender: line2.substring(20, 21), // M/F
      ExpiryDate: formatDate(line2.substring(21, 27)), // Expiry date in YYMMDD
      IssueDate: issueDate, // Correctly extracted Issue Date
    };
  };

  console.log("passportData", passportData);

  // Convert YYMMDD to DD-MM-YYYY format
  const formatDate = (yyMMdd) => {
    if (!yyMMdd.match(/\d{6}/)) return "Not found";
    const year = `20${yyMMdd.substring(0, 2)}`;
    const month = yyMMdd.substring(2, 4);
    const day = yyMMdd.substring(4, 6);
    return `${day}-${month}-${year}`;
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageChange} />

      {selectedImage && (
        <img
          src={URL.createObjectURL(selectedImage)}
          alt="Uploaded content"
          width={350}
          style={{ marginTop: 15 }}
        />
      )}

      <div style={{ marginTop: 15 }}>
        <button
          onClick={readImageText}
          style={{
            background: "#FFFFFF",
            borderRadius: 7,
            color: "#000000",
            padding: 5,
          }}
        >
          Submit
        </button>
      </div>

      <p style={{ marginTop: 20, fontWeight: 700 }}>Status:</p>
      <p>{ocrStatus}</p>

      <h3 style={{ marginTop: 10, fontWeight: 700 }}>
        Extracted Passport Data:
      </h3>
      {passportData ? (
        <div
          style={{
            border: "1px solid white",
            width: "fit-content",
            padding: 10,
            marginTop: 10,
            borderRadius: 10,
            whiteSpace: "pre-wrap",
          }}
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
      ) : (
        <p>No passport data found.</p>
      )}
    </div>
  );
};

export default OcrComponent;
