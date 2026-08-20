import prisma from './prisma';

export class AuditService {
  /**
   * Sisteme ait izlenebilirlik (Audit) kaydını oluşturur
   * @param userId İşlemi yapan kullanıcının ID'si
   * @param action İşlemin türü (Örn: 'SOFT_DELETE_STUDENT', 'UPDATE_SETTINGS', vb.)
   * @param entity İşlemin yapıldığı tablo/varlık (Örn: 'Student', 'Settings')
   * @param entityId İşlemin yapıldığı kaydın ID'si
   * @param metadata Ekstra veri (JSON string olarak saklanabilir)
   */
  static async log(userId: string, action: string, entity: string, entityId: string, metadata?: any) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      console.error('AuditLog kaydedilemedi:', error);
    }
  }
}
