import { enableGenerateButton } from '../ui/viewportControls.js';

export function sendGenerateRequest(requestData) {
    fetch('/download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    }).then(response => {
        if (!response.ok) {
            throw new Error('The map generation request failed.');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        const fileNameMatch = contentDisposition && contentDisposition.match(/filename="([^"]+)"/);
        const fileName = fileNameMatch ? fileNameMatch[1] : 'mapdata';

        return response.blob().then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            enableGenerateButton();
        });
    }).catch(error => {
        console.error('Error:', error);
        alert('Request failed: ' + error.message);

        enableGenerateButton();
    });
}
