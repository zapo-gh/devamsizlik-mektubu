import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../components/ui/PrintableDocument';

export interface ParentMeetingStudent {
  orderNo: number;
  studentFullName: string;
  parentFullName?: string;
}

export interface ParentMeetingPdfData {
  schoolName: string;
  className: string;
  meetingDate: string; // ISO string
  schoolYear: string;
  term: string;
  students: ParentMeetingStudent[];
}

interface ParentMeetingPrintTemplateProps {
  data: ParentMeetingPdfData[];
}

export const ParentMeetingPrintTemplate = forwardRef<HTMLDivElement, ParentMeetingPrintTemplateProps>(
  ({ data }, ref) => {
    if (!data || data.length === 0) return null;

    return (
      <PrintableDocument ref={ref} landscape={false}>
        <style>{`
          .pm-page { page-break-after: always; padding: 20px; font-family: 'Times New Roman', Times, serif; }
          .pm-page:last-child { page-break-after: auto; }
          .pm-header { text-align: center; margin-bottom: 20px; }
          .pm-school-name { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
          .pm-title { font-size: 14px; font-weight: bold; margin-bottom: 15px; }
          .pm-info { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
          .pm-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .pm-table th { background-color: #f3f4f6; border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; }
          .pm-table td { border: 1px solid #000; padding: 6px 8px; }
          .col-no { width: 50px; text-align: center; font-weight: bold; }
          .col-student { width: 30%; }
          .col-parent { width: 30%; }
          .col-relation { width: 15%; }
          .col-sign { width: 25%; }
        `}</style>

        {data.map((item, index) => (
          <div key={`${item.className}-${index}`} className="pm-page">
            <div className="pm-header">
              <div className="pm-school-name">{item.schoolName}</div>
              <div className="pm-title">{item.schoolYear} EĞİTİM ÖĞRETİM YILI {item.term} VELİ TOPLANTISI KATILIM İMZA SİRKÜSÜ</div>
              <div className="pm-info">
                <div>Sınıf/Şube : {item.className}</div>
                <div>Tarih : {new Date(item.meetingDate).toLocaleDateString('tr-TR')}</div>
              </div>
            </div>

            <table className="pm-table">
              <thead>
                <tr>
                  <th className="col-no">Sıra<br/>No</th>
                  <th className="col-student">Öğrenci Adı Soyadı</th>
                  <th className="col-parent">Veli Adı Soyadı</th>
                  <th className="col-relation">Yakınlık<br/>Derecesi</th>
                  <th className="col-sign">Veli İmzası</th>
                </tr>
              </thead>
              <tbody>
                {item.students.map((student) => (
                  <tr key={student.orderNo}>
                    <td className="col-no">{student.orderNo}</td>
                    <td className="col-student">{student.studentFullName}</td>
                    <td className="col-parent">{student.parentFullName || ''}</td>
                    <td className="col-relation"></td>
                    <td className="col-sign"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </PrintableDocument>
    );
  }
);
