const MAX_CHARS = 8000

/**
 * Extracts plain text from a resume file entirely in the browser — the file
 * itself is never sent anywhere. Only the extracted text (capped) leaves
 * the client, to the /api/resume-match endpoint.
 *
 * pdfjs-dist is loaded lazily so its ~1MB parser only downloads for users
 * who actually upload a PDF, not on every page load.
 */
export async function extractResumeText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const [pdfjsLib, workerUrlModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlModule.default

    const buffer = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise
    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '))
    }
    return pages.join('\n').slice(0, MAX_CHARS)
  }
  if (file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name)) {
    return (await file.text()).slice(0, MAX_CHARS)
  }
  throw new Error('Unsupported file type — upload a PDF, .txt, or .md file.')
}
