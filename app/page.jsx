import MultipleOcr from "@/components/MultipleOcr";
import OcrComponents from "@/components/OcrComponents";

const HomePage = () => {
  return (
    <div className="p-6 mx-auto max-w-full">
      <h1 className="">OCR with Tesseract.js in Next.js</h1>
      <br />
      {/* <OcrComponents /> */}
      <MultipleOcr />
    </div>
  );
};

export default HomePage;
