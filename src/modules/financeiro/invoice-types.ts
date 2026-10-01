export interface ServiceInvoice {
  id: string;
  saleId: string | null;
  customerName: string;
  status: "pending" | "processing" | "issued" | "error" | "cancelled";
  nfseNumber: string | null;
  pdfUrl: string | null;
  errorMessage: string | null;
  amountCents: number;
  createdAt: string;
  issuedAt: string | null;
}
