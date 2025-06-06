document.addEventListener('DOMContentLoaded', () => {
    const toastContainer = document.getElementById('toastContainer');

    if (!toastContainer) {
        console.error('Toast container not found.');
        return;
    }

    window.showToast = function (message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = message;

        // Style (optional, can also be in CSS)
        toast.style.padding = '10px';
        toast.style.margin = '10px';
        toast.style.borderRadius = '5px';
        toast.style.backgroundColor = type === 'success' ? '#4caf50' : '#f44336';
        toast.style.color = 'white';
        toast.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, duration);
    };
});
