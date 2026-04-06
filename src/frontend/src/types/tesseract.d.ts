// Type shim for tesseract.js (loaded dynamically)
declare module "tesseract.js" {
  export interface Worker {
    recognize(image: File | Blob | string): Promise<{ data: { text: string } }>;
    terminate(): Promise<void>;
  }
  export function createWorker(lang: string): Promise<Worker>;
}
