/**
 * afterPack hook — Windows API (kernel32 P/Invoke) ile icon.ico'yu
 * OkulDesk.exe'ye gömer. winCodeSign / rcedit gerekmez.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

exports.default = async function afterPack(context) {
  // Yalnızca Windows paketiyle çalış
  if (process.platform !== 'win32') return;

  const { appOutDir } = context;
  const productName = context.packager.appInfo.productFilename || 'OkulDesk';
  const exePath = path.join(appOutDir, productName + '.exe');
  const icoPath = path.resolve(__dirname, '../assets/icon.ico');

  if (!fs.existsSync(exePath)) {
    console.log('[afterPack] EXE bulunamadı, ikon ekleme atlandı:', exePath);
    return;
  }
  if (!fs.existsSync(icoPath)) {
    console.log('[afterPack] ICO bulunamadı, ikon ekleme atlandı:', icoPath);
    return;
  }

  console.log('[afterPack] İkon EXE\'ye gömülüyor:', exePath);

  // Yolları PS için hazırla (backslash kaçışı)
  const exeEsc = exePath.replace(/\\/g, '\\\\');
  const icoEsc = icoPath.replace(/\\/g, '\\\\');

  const psScript = `
Add-Type @'
using System;
using System.IO;
using System.Runtime.InteropServices;
public class PeIcon {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr BeginUpdateResource(string p, bool del);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool UpdateResource(IntPtr h, uint t, uint n, ushort l, byte[] d, uint s);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool EndUpdateResource(IntPtr h, bool discard);
    public static void Embed(string exePath, string icoPath) {
        byte[] ico = File.ReadAllBytes(icoPath);
        ushort count = BitConverter.ToUInt16(ico, 4);
        IntPtr h = BeginUpdateResource(exePath, false);
        if (h == IntPtr.Zero) throw new Exception("BeginUpdateResource hata: " + Marshal.GetLastWin32Error());
        for (int i = 0; i < count; i++) {
            int e = 6 + i * 16;
            uint sz  = BitConverter.ToUInt32(ico, e + 8);
            uint off = BitConverter.ToUInt32(ico, e + 12);
            byte[] img = new byte[sz];
            Array.Copy(ico, off, img, 0, sz);
            if (!UpdateResource(h, 3, (uint)(i + 1), 0, img, sz))
                throw new Exception("UpdateResource RT_ICON " + i + " hata: " + Marshal.GetLastWin32Error());
        }
        int gsz = 6 + count * 14;
        byte[] grp = new byte[gsz];
        Array.Copy(ico, 0, grp, 0, 6);
        for (int i = 0; i < count; i++) {
            int s = 6 + i * 16, d = 6 + i * 14;
            Array.Copy(ico, s, grp, d, 12);
            grp[d + 12] = (byte)(i + 1);
            grp[d + 13] = 0;
        }
        if (!UpdateResource(h, 14, 1, 0, grp, (uint)gsz))
            throw new Exception("UpdateResource RT_GROUP_ICON hata: " + Marshal.GetLastWin32Error());
        if (!EndUpdateResource(h, false))
            throw new Exception("EndUpdateResource hata: " + Marshal.GetLastWin32Error());
    }
}
'@
[PeIcon]::Embed('${exeEsc}', '${icoEsc}')
Write-Host "[afterPack] ikon basariyla gomuldu"
`;

  const tmpPs = path.join(os.tmpdir(), 'okuldesk-embed-icon.ps1');
  fs.writeFileSync(tmpPs, psScript, 'utf8');

  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${tmpPs}"`, { stdio: 'inherit' });
    console.log('[afterPack] İkon başarıyla gömüldü.');
  } catch (err) {
    console.error('[afterPack] İkon gömme başarısız:', err.message);
  } finally {
    try { fs.unlinkSync(tmpPs); } catch (_) {}
  }
};
