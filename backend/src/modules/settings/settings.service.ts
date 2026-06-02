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
      waTemplate1: settings.waTemplate1 ?? '',
      waTemplate2: settings.waTemplate2 ?? '',
      waTemplate3: settings.waTemplate3 ?? '',
    };
  }

  async update(data: { schoolName?: string; principalName?: string; waTemplate1?: string; waTemplate2?: string; waTemplate3?: string }) {
    const settings = await prisma.schoolSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        schoolName: data.schoolName ?? '',
        principalName: data.principalName ?? '',
        waTemplate1: data.waTemplate1 ?? '',
        waTemplate2: data.waTemplate2 ?? '',
        waTemplate3: data.waTemplate3 ?? '',
      },
      update: {
        ...(data.schoolName !== undefined && { schoolName: data.schoolName }),
        ...(data.principalName !== undefined && { principalName: data.principalName }),
        ...(data.waTemplate1 !== undefined && { waTemplate1: data.waTemplate1 }),
        ...(data.waTemplate2 !== undefined && { waTemplate2: data.waTemplate2 }),
        ...(data.waTemplate3 !== undefined && { waTemplate3: data.waTemplate3 }),
      },
    });

    return {
      schoolName: settings.schoolName,
      principalName: settings.principalName,
      waTemplate1: settings.waTemplate1 ?? '',
      waTemplate2: settings.waTemplate2 ?? '',
      waTemplate3: settings.waTemplate3 ?? '',
    };
  }
}

export const settingsService = new SettingsService();
