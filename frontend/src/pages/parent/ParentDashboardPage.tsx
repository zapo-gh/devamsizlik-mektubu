import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface AbsenteeismData {
  id: string;
  studentId: string;
  warningNumber: number;
  pdfPath: string;
  viewedByParent: boolean;
  student: {
    fullName: string;
    className: string;
    schoolNumber: string;
  };
}

function isImageFile(pdfPath: string): boolean {
  const ext = pdfPath.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png'].includes(ext);
}

export default function ParentDashboardPage() {
  const [data, setData] = useState<AbsenteeismData | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('parentAbsenteeism');
    if (!stored) {
      navigate('/veli-otp');
      return;
    }
    setData(JSON.parse(stored));
  }, [navigate]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  if (!data) return null;

  const otpToken = sessionStorage.getItem('parentOtpToken') || '';
  const tokenQuery = otpToken ? `?token=${otpToken}` : '';
  const pdfUrl = `/api/absenteeism/${data.id}/pdf${tokenQuery}`;
  const downloadUrl = `/api/absenteeism/${data.id}/pdf/download${tokenQuery}`;

  return (
    <div className="parent-container">
      <div className="parent-card">
        <h1>Devamsızlık Mektubu</h1>

        {/* Student Info - horizontal compact rows */}
        <div className="parent-info-grid">
          <div className="parent-info-row">
            <span className="parent-info-label">Öğrenci</span>
            <span className="parent-info-value">{data.student.fullName}</span>
          </div>
          <div className="parent-info-row">
            <span className="parent-info-label">Sınıf</span>
            <span className="parent-info-value">{data.student.className}</span>
          </div>
          <div className="parent-info-row">
            <span className="parent-info-label">Okul No</span>
            <span className="parent-info-value">{data.student.schoolNumber}</span>
          </div>
          <div className="parent-info-row">
            <span className="parent-info-label">Uyarı</span>
            <span
              className="parent-info-value"
              style={{
                color: data.warningNumber >= 3 ? '#dc2626' : data.warningNumber === 2 ? '#ea580c' : '#ca8a04',
                fontWeight: 700,
              }}
            >
              {data.warningNumber}. Uyarı
            </span>
          </div>
        </div>

        {/* File Viewer */}
        {data && isImageFile(data.pdfPath) ? (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img
              src={pdfUrl}
              alt="Devamsızlık Mektubu"
              style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>
        ) : (
          <>
            <div className="pdf-viewer-container">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <div className="spinner spinner-dark" />
                    <p style={{ marginTop: 12 }}>PDF yükleniyor...</p>
                  </div>
                }
                error={
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
                    PDF yüklenirken hata oluştu.
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={Math.min(window.innerWidth - 32, 700)}
                />
              </Document>
            </div>

            {/* Page navigation */}
            {numPages && numPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber(pageNumber - 1)}
                >
                  ← Önceki
                </button>
                <span style={{ fontSize: 14 }}>
                  {pageNumber} / {numPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber(pageNumber + 1)}
                >
                  Sonraki →
                </button>
              </div>
            )}
          </>
        )}

        {/* Download button */}
        <a
          href={downloadUrl}
          className="btn btn-primary parent-download-btn"
          download
        >
          Dosyayı İndir
        </a>

        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          <p style={{ margin: 0 }}>Bu sayfa tek seferlik erişim için oluşturulmuştur.</p>
        </div>
      </div>
    </div>
  );
}
