import jsPDF from 'jspdf';

export function exportPNG(canvas: HTMLCanvasElement) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'whiteboard.png';
  a.click();
}

export function exportPDF(canvas: HTMLCanvasElement) {
  const pdf = new jsPDF('landscape');
  const img = canvas.toDataURL('image/png');
  pdf.addImage(img, 'PNG', 10, 10, 280, 160);
  pdf.save('whiteboard.pdf');
}
