import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDFReceipt = async (
  elementId: string,
  fileName: string = 'Receipt.pdf'
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Temporarily make it visible if it's hidden (for html2canvas to render)
    const originalDisplay = element.style.display;
    const originalPosition = element.style.position;
    const originalVisibility = element.style.visibility;

    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.visibility = 'visible';
    element.style.top = '-9999px';
    element.style.left = '-9999px';

    const canvas = await html2canvas(element, { scale: 2 });
    
    // Revert styles
    element.style.display = originalDisplay;
    element.style.position = originalPosition;
    element.style.visibility = originalVisibility;
    element.style.top = '';
    element.style.left = '';

    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};
