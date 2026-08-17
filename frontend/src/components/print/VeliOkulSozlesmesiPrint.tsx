import React from 'react';
import { CorporateHeader } from './CorporateHeader';

interface VeliOkulSozlesmesiProps {
  schoolName: string;
  student?: {
    fullName: string;
    schoolNumber: string;
    tcNo?: string;
    className?: string;
    parents?: Array<{ fullName: string }>;
  } | null;
  principalName?: string;
  assistantPrincipalName?: string;
}

export const VeliOkulSozlesmesiPrint: React.FC<VeliOkulSozlesmesiProps> = ({ schoolName, student, principalName }) => {
  return (
    <div className="print-document" style={{ 
      fontFamily: '"Times New Roman", Times, serif', 
      fontSize: '8.5px', 
      lineHeight: '1.15', 
      color: 'black', 
      padding: '0 10px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      
      <div>
        <CorporateHeader schoolName={schoolName} />
        
        <h3 style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '5px', fontSize: '11px' }}>
          ÖĞRENCİ-VELİ-OKUL SÖZLEŞMESİ
        </h3>
        
        <p style={{ textAlign: 'justify', marginBottom: '5px' }}>
          Okul - veli iş birliği, öğrenci başarısını artıran önemli etmenlerden biridir. Güvenli ve düzenli bir okul ortamının sağlanmasında velilerin rolü büyüktür. Veli katılımının öncelikli amacı, okulun eğitim etkinliklerini yönlendiren okul personeline destek olmak, çalışmalara meslekleri ve yeterlilikleri doğrultusunda farklı düzeylerde katkı sağlamak, okul ve ev arasında sıkı bağlar kurarak öğrencinin eğitim sürecinde huzurlu ve mutlu olmasına yardımcı olmaktır.
        </p>

        <div style={{ marginBottom: '5px' }}>
          <strong>Sözleşmenin Tarafları:</strong>
          <ul style={{ margin: '2px 0', paddingLeft: '15px' }}>
          <li>Öğrenci: <strong>{student ? student.fullName : '________________________________________________'}</strong></li>
          <li>Öğrenci Velisi / Anne-Babası veya yasal vasisi: <strong>{student?.parents?.[0] ? student.parents[0].fullName : '________________________________________________'}</strong></li>
          <li>Okul Yönetimi: <strong>{(schoolName || '').toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜ</strong></li>
        </ul>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', flex: 1 }}>
        
        {/* Okulun Hak ve Sorumlulukları */}
        <div>
          <h4 style={{ fontWeight: 'bold', borderBottom: '1px solid black', marginBottom: '6px', fontSize: '10px', textAlign: 'center' }}>OKULUN HAK VE SORUMLULUKLARI</h4>
          
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>Haklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'disc' }}>
            <li>Destekleyici, güvenli ve etkili bir ortamda çalışmak</li>
            <li>Okul toplumundan ve çevreden saygı ve destek görmek</li>
            <li>Okulda alınan tüm kararlara ve okul kurallarına uyulmasını istemek</li>
          </ul>
          <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px' }}>Okula Özgü Haklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'circle' }}>
            <li>Gerek görüldüğü takdirde planlanmış eğitim etkinliklerinin yer, zaman ve içeriğini en az bir hafta önceden haber vererek değiştirmek.</li>
            <li>Ödül ve cezalara karar vermek; öğrenci ve velilerin bu kararları saygıyla karşılamasını ve önerilere uyulmasını beklemek</li>
            <li>Okulun hedeflerine uygun planlamalara öğrenci ve velilerin katılımını ve desteğini beklemek</li>
          </ul>

          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '10px', marginBottom: '4px' }}>Sorumluluklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'disc' }}>
            <li>Öğrencilerin akademik ve sosyal gelişimlerini destekleyecek materyal, ekipman ve teknolojik donanım sağlamak.</li>
            <li>Okulda olumlu bir kültür yaratmak.</li>
            <li>Öğrenci, veli ve çalışanlar arasında hiçbir nedenden dolayı ayrım yapmamak.</li>
            <li>Eğitim ve öğretim sürecini okulun duvarlarıyla sınırlamamak.</li>
            <li>Öğrencilerin, velilerin okul çalışanlarının kendilerini ve fikirlerini ifade edebilecekleri fırsatlar yaratmak.</li>
            <li>Okulun güvenilir ve temiz olmasını sağlamak.</li>
            <li>Öğrenciler için iyi bir model olmak.</li>
            <li>Okulun ve öğrencinin ihtiyaçları doğrultusunda sürekli gelişmek.</li>
            <li>Okulda etkili öğrenmeyi destekleyecek bir ortam yaratmak.</li>
            <li>Okulun işleyişine ait kararların ve kuralların uygulanmasını takip etmek.</li>
            <li>Okul - toplum ilişkisini geliştirmek.</li>
            <li>Öğretmen, öğrenci ve veli görüşmelerini düzenlemek ve ilgilileri zamanında bilgilendirmek.</li>
            <li>Okul çalışanlarının ihtiyaçları doğrultusunda okul içi eğitim çalışmaları düzenlemek.</li>
            <li>Okul çalışanlarının ihtiyaçlarını belirleyerek giderilmesi için çözümler üretmek.</li>
            <li>Okulun işleyişi ve yönetimi konusunda ilgili tarafları düzenli aralıklarla bilgilendirmek.</li>
            <li>Veli ve öğrenci hakkında ihtiyaç duyulan bilgileri toplamak, değerlendirmek, sonuçlarını ilgililerle paylaşmak ve gizliliğini sağlamak.</li>
            <li>Veli ve öğretmenler arasında düzenli bir iletişimi sağlamak.</li>
            <li>Okul ve çevresinde şiddet içeren davranışlara kesinlikle izin vermemek.</li>
          </ul>
          <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px' }}>Okula Özgü Sorumluluklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'circle' }}>
            <li>Bilimsel süreli yayınları okul kütüphanesinde kullanıma sunmak.</li>
            <li>Öğrenciler için toplumsal hizmet etkinlikleri planlamak ve yürütmek</li>
          </ul>
        </div>
        
        {/* Öğrencinin Hak ve Sorumlulukları */}
        <div>
          <h4 style={{ fontWeight: 'bold', borderBottom: '1px solid black', marginBottom: '6px', fontSize: '10px', textAlign: 'center' }}>ÖĞRENCİNİN HAK VE SORUMLULUKLARI</h4>
          
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>Haklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'disc' }}>
            <li>Düşüncelerini özgürce ifade etme</li>
            <li>Güvenli ve sağlıklı bir okul ve sınıf ortamında bulunma</li>
            <li>Bireysel farklılıklarına saygı gösterilmesi</li>
            <li>Kendisine ait değerlendirme sonuçlarını zamanında öğrenme ve sonuçlar üzerindeki fikirlerini ilgililerle tartışabilme</li>
            <li>Kendisine ait özel bilgilerin gizliliğinin sağlanması</li>
            <li>Okulun işleyişi, kuralları, alınan kararlar hakkında bilgilendirilme</li>
            <li>Okul kurallarının uygulanmasında tüm öğrencilere eşit davranılması</li>
            <li>Kendini ve diğer öğrencileri tanıma, kariyer planlama, karar verme ve ihtiyaç duyduğu benzer konularda danışmanlık alma</li>
            <li>Akademik ve kişisel gelişimini destekleyecek ders dışı etkinliklere katılma</li>
            <li>Okul yönetiminde temsil etme ve edilme</li>
          </ul>
          <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px' }}>Okula Özgü Haklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'circle' }}>
            <li>Özgün eserlerini kamuya sergileme</li>
            <li>Ulusal ve uluslar arası etkinliklerde okulu temsil etmede gerekli durumlarda okuldan maddi ve manevi destek alabilme</li>
            <li>Ders dışı etkinliklerle ilgili sorumluluklar dâhilinde okulun her türlü olanağından yararlanma</li>
          </ul>

          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '10px', marginBottom: '4px' }}>Sorumluluklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'disc' }}>
            <li>Okulda bulunan kişilerin haklarına ve kişisel farklılıklarına saygı göstereceğim.</li>
            <li>Ders dışı etkinliklere katılıp bu etkinliklerden en iyi şekilde yararlanacağım.</li>
            <li>Arkadaşlarımın ve okulun eşyalarına zarar vermeyeceğim; zarar verdiğim takdirde bu zararın bedelini karşılayacağım.</li>
            <li>Sınıfça belirlediğimiz kurallara uyacağım.</li>
            <li>Ödül ve disiplin yönetmeliğine ve veli-öğrenci el kitapçığında yer alan tüm okul kurallarına uyacağım.</li>
            <li>Okul yönetimine (fikir, eleştiri, öneri ve çalışmalarımla) katkıda bulunacağım.</li>
            <li>Arkadaşlarıma, öğretmenlerime ve tüm okul çalışanlarına saygılı davranacağım.</li>
            <li>Hiçbir şekilde kaba kuvvete ve baskıya başvurmayacağım.</li>
            <li>Okula cep telefonu getirmeyeceğim. Zorunlu olarak getirdiğim durumlarda okulun belirlediği kurallar ölçüsünde muhafaza edeceğim. Telefon ile ilgili kurallara uymadığım takdirde öğretmen ve okul idaresi tarafından telefonumun alınarak sadece velime teslim edilmesini kabul ediyorum. Bu esnada telefona gelebilecek herhangi bir zarar konusunda okul idaresi ve öğretmeni sorumlu tutamayacağım konusunda bilgilendirildim.</li>
            <li>Tütün ve mamullerini okulda kullanmayacağım. Kullandığım takdirde gerekli disiplin işlemlerinin uygulanacağı konusunda bilgilendirildim.</li>
            <li>Öğretmenlerime kesinlikle saygısızlık yapmayacağım.</li>
          </ul>
          <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px' }}>Okula Özgü Sorumluluklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'circle' }}>
            <li>Okulun bilim ve sanat panolarına yazı ve fotoğraflarla katkıda bulunacağım.</li>
            <li>Okulda düzenlenecek eğitim semineri ve toplantılarda gelen konuklara ilgili birimlere ulaşmaları için rehberlik edeceğim.</li>
            <li>Okulun eğitim felsefesine uygun, çalışkan ve gayretli olacağım</li>
            <li>Okulumun adını her zaman üst düzeyde tutacak davranış ve gayret içinde olacağım</li>
          </ul>
        </div>

        {/* Velinin Hak ve Sorumlulukları */}
        <div>
          <h4 style={{ fontWeight: 'bold', borderBottom: '1px solid black', marginBottom: '6px', fontSize: '10px', textAlign: 'center' }}>VELİNİN HAK VE SORUMLULUKLARI</h4>
          
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>Haklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'disc' }}>
            <li>Çocuğumun eğitimiyle ilgili tüm konularda bilgilendirilmek.</li>
            <li>Adil ve saygılı davranışlarla karşılanmak.</li>
            <li>Çocuğuma okul ortamında nitelikli kaynaklar, eğitim ve fırsatlar sunulacağını bilmek.</li>
            <li>Düzenli aralıklarla okulun işleyişi hakkında bilgilendirilmek.</li>
            <li>Okul Aile Birliği aracılığı ile okul yönetimine yardımcı olmak ve böylelikle katkıda bulunmak.</li>
            <li>Çocuğumun okuldaki gelişim süreciyle ilgili olarak düzenli aralıklarla bilgilendirilmek.</li>
          </ul>
          <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px' }}>Okula Özgü Haklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'circle' }}>
            <li>Okulun veli eğitim çalışmalarından yararlanmak.</li>
            <li>Okulun sunduğu tüm sosyal ve kültürel etkinliklerden yararlanmak</li>
          </ul>

          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '10px', marginBottom: '4px' }}>Sorumluluklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'disc' }}>
            <li>Çocuğumun her gün okula zamanında, öğrenmeye hazır, okulun kılık-kıyafet kurallarına uygun bir şekilde gitmesine yardımcı olacağım.</li>
            <li>Okulun duyuru ve yayınlarını takip edeceğim.</li>
            <li>Bilgi edinmek ve toplamak amacıyla gönderilen her tür anket ve formu doldurup zamanında geri göndereceğim.</li>
            <li>Okul Gelişim Yönetim Ekibi ve Okul-Aile Birliği seçimlerine ve toplantılarına katılacağım.</li>
            <li>İhtiyaç duyduğunda öğrencimin ödevlerini yapabilmesi konusunda olanak sağlayacağım, gerekli açıklamaları yapacağım, ancak; kendi yapması gereken ödevleri asla yapmayacağım.</li>
            <li>Çocuğumun sağlıklı bir şekilde çalışabilmesine uygun fiziki ortamı sağlayacağım.</li>
            <li>Çocuğumun uyku ve dinlenme saatlerine dikkat edeceğim.</li>
            <li>Okulun düzenleyeceği veli eğitim seminerlerine katılacağım</li>
            <li>Çocuğuma yaşına uygun sorumluluklar vereceğim.</li>
            <li>Disiplin yönetmeliğini ve veli-öğrenci el kitapçığını dikkatlice okuyup çocuğumun, disiplin kurallarına uyması için gerekli önlemleri alacağım.</li>
            <li>Çocuğumun ruhsal ve fiziksel durumundaki değişmeler hakkında okulu zamanında bilgilendireceğim.</li>
            <li>Aile ortamında fiziksel ve psikolojik şiddete izin vermeyeceğim.</li>
          </ul>
          <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px' }}>Okula Özgü Sorumluluklar:</div>
          <ul style={{ paddingLeft: '12px', margin: 0, textAlign: 'justify', listStyleType: 'circle' }}>
            <li>Okula maddi manevi her türlü katkıda bulunacağım</li>
            <li>Çocuğumun internette zararlı içeriklerin yer aldığı sitelere erişmesini engelleyeceğim.</li>
            <li>Çocuğumun toplumsal hizmet kurumlarında gönüllü olarak çalışmasını, sosyal yardım etkinliklerinde görev almasını destekleyeceğim.</li>
          </ul>
        </div>
      </div>
      </div>

      <div style={{ marginTop: '10px' }}>
        <p style={{ fontStyle: 'italic', textAlign: 'center', marginBottom: '10px' }}>
          Sözleşmenin tarafı olarak yukarıda sunulan hak ve sorumluluklarımı okudum. Haklarıma sahip çıkacağıma ve sorumluluklarımı yerine getireceğime söz veririm.
        </p>

        <table style={{ width: '100%', textAlign: 'center', marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '33%' }}>
              <strong>Öğrenci</strong><br />
              {student ? student.fullName : 'Adı Soyadı'}
              <div style={{ height: '20px' }}></div>
              İmza
            </td>
            <td style={{ width: '33%' }}>
              <strong>Öğrenci Velisi</strong><br />
              {student?.parents?.[0] ? student.parents[0].fullName : 'Adı Soyadı'}
              <div style={{ height: '20px' }}></div>
              İmza
            </td>
            <td style={{ width: '33%' }}>
              <strong>Okul Müdürü</strong><br />
              {principalName || 'Adı Soyadı'}
              <div style={{ height: '20px' }}></div>
              İmza
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
};
