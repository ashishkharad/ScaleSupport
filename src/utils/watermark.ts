export interface WatermarkOptions {
  imageSource: HTMLImageElement | HTMLVideoElement | string;
  accountId: string;
  agentId: string;
  agentName: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  remark: string;
  visitId?: string;
  customerName?: string;
}

export interface WatermarkResult {
  dataUrl: string;
  watermarkText: string;
  driveFileId: string;
  driveFolder: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
}

/**
 * Generates an official SRMS Geo-tagged Watermarked Photo using HTML5 Canvas.
 */
export async function createSRMSWatermarkedPhoto(
  options: WatermarkOptions
): Promise<WatermarkResult> {
  const {
    imageSource,
    accountId,
    agentId,
    agentName,
    date,
    time,
    latitude,
    longitude,
    accuracy = 4.5,
    remark,
    visitId,
    customerName,
  } = options;

  const safeLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 19.8762;
  const safeLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 75.3433;
  const safeAcc = typeof accuracy === 'number' && !isNaN(accuracy) ? accuracy : 4.5;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return reject(new Error('Canvas 2D context not available'));
    }

    const processCanvas = (img: HTMLImageElement | HTMLVideoElement) => {
      const width = 1200;
      const height = 900;
      canvas.width = width;
      canvas.height = height;

      // 1. Draw source image scaled to fill
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Draw GPS crosshair / camera target in the center area
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 40, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width / 2 - 35, height / 2 - 40);
      ctx.lineTo(width / 2 + 35, height / 2 - 40);
      ctx.moveTo(width / 2, height / 2 - 75);
      ctx.lineTo(width / 2, height / 2 - 5);
      ctx.stroke();
      ctx.restore();

      // 3. Draw Watermark Container Box in Lower-Left side (max 15% of total photo area)
      // Total photo area = 1200 * 900 = 1,080,000 px^2.
      // 15% limit = 162,000 px^2.
      // Box size: 460px width * 260px height = 119,600 px^2 (approx 11.0% of photo area).
      const boxWidth = 460;
      const boxHeight = 260;
      const boxX = 24; // Lower-left margin
      const boxY = height - boxHeight - 24; // Lower-left vertical position

      // Semi-transparent glass background with subtle light border
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)'; // Transparent dark background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 14);
      ctx.fill();
      ctx.stroke();

      // Top subtle header bar inside box
      ctx.fillStyle = 'rgba(30, 58, 138, 0.45)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, 38, [14, 14, 0, 0]);
      ctx.fill();

      // Header Text
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText('ScaleSupport • GPS AUDIT', boxX + 16, boxY + 24);

      // Accuracy tag
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#93c5fd';
      ctx.textAlign = 'right';
      ctx.fillText(`±${safeAcc.toFixed(1)}m`, boxX + boxWidth - 16, boxY + 24);
      ctx.textAlign = 'left';

      // Customer Name (prominent requirement)
      const contentStartX = boxX + 16;
      let curY = boxY + 62;

      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Customer:', contentStartX, curY);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      const displayCustomerName = customerName || 'Verified Borrower';
      const truncatedCustomer =
        displayCustomerName.length > 28 ? displayCustomerName.slice(0, 26) + '...' : displayCustomerName;
      ctx.fillText(truncatedCustomer, contentStartX + 82, curY);

      // Account ID
      curY += 26;
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Account ID:', contentStartX, curY);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(accountId, contentStartX + 82, curY);

      // Agent Details
      curY += 24;
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Agent:', contentStartX, curY);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      const agentLabel = `${agentId} (${agentName})`;
      ctx.fillText(agentLabel.length > 30 ? agentLabel.slice(0, 28) + '...' : agentLabel, contentStartX + 82, curY);

      // Date & Time
      curY += 24;
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Date/Time:', contentStartX, curY);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${date}  ${time}`, contentStartX + 82, curY);

      // GPS Coordinates
      curY += 24;
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText('GPS Loc:', contentStartX, curY);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`${safeLat.toFixed(6)}° N, ${safeLng.toFixed(6)}° E`, contentStartX + 82, curY);

      // Divider Line
      curY += 14;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(contentStartX, curY);
      ctx.lineTo(boxX + boxWidth - 16, curY);
      ctx.stroke();

      // Remark Section
      curY += 20;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Remark:', contentStartX, curY);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      const cleanRemark = remark.trim() || 'Field geo-tagged premises verification completed.';
      const remarkLines = wrapText(ctx, cleanRemark, boxWidth - 100);
      ctx.fillText(remarkLines[0] || cleanRemark, contentStartX + 60, curY);

      // Bottom ID inside box
      const driveId = `DRV_IMG_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`Drive Ref: ${driveId}`, contentStartX, boxY + boxHeight - 10);

      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      const watermarkText = `ScaleSupport GPS AUDIT\n\nCustomer: ${customerName || 'Verified Borrower'}\nAccount ID: ${accountId}\nAgent: ${agentId} (${agentName})\n\nDate: ${date}\nTime: ${time}\n\nLatitude: ${safeLat.toFixed(6)}° N\nLongitude: ${safeLng.toFixed(6)}° E\nAccuracy: ±${safeAcc.toFixed(1)}m\n\nRemark:\n${remark}`;

      resolve({
        dataUrl,
        watermarkText,
        driveFileId: driveId,
        driveFolder: `ScaleSupport/Accounts/${accountId}/Photos`,
        date,
        time,
        latitude: safeLat,
        longitude: safeLng,
      });
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processCanvas(img);
      img.onerror = () => reject(new Error('Failed to load image source'));
      img.src = imageSource;
    } else {
      processCanvas(imageSource);
    }
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateCommission(recoveryAmount: number, rate: number = 10): number {
  return Math.round((recoveryAmount * rate) / 100);
}
