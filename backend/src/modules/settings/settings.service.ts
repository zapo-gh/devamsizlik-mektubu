import prisma from '../shared/utils/prisma';

const SINGLETON_ID = 'singleton';

class SettingsService {
  async get() {
    let settings = await prisma.schoolSettings.findUnique({
      where: { id: SINGLETON_ID },
    });

    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: { id: SINGLETON_ID, schoolName: '', principalName: '' },
      });
    }

    return {
      schoolName: settings.schoolName,
      principalName: settings.principalName,
    };
  }

  async update(data: { schoolName?: string; principalName?: string }) {
    const settings = await prisma.schoolSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        schoolName: data.schoolName ?? '',
        principalName: data.principalName ?? '',
      },
      update: {
        ...(data.schoolName !== undefined && { schoolName: data.schoolName }),
        ...(data.principalName !== undefined && { principalName: data.principalName }),
      },
    });

    return {
      schoolName: settings.schoolName,
      principalName: settings.principalName,
    };
  }
}

export const settingsService = new SettingsService();
