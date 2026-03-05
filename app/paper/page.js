import Footer from '@/components/Footer';

export default function PaperPage() {
  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <h1 className="section-title">Paper</h1>
      <div className="card">
        <object data="/currentModel.pdf" type="application/pdf" width="100%" height="800px">
          <p>
            Your browser does not support PDFs. <a href="/currentModel.pdf">Download the paper</a>.
          </p>
        </object>
      </div>
      <Footer />
    </div>
  );
}
