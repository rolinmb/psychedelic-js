function init() {
    const canvas = document.getElementById("canvas");
    const downloadBtn = document.getElementById("download-btn");
    const filenameInput = document.getElementById("filename");
    const formatSelect = document.getElementById("image-format");
    const ctx = canvas.getContext("2d");

    downloadBtn.addEventListener("click", () => {
        let filename = filenameInput.value.trim();
        const format = formatSelect.value;

        if (!filename) {
            filename = "canvas";
        }

        const extension = format.split("/")[1];

        canvas.toBlob((blob) => {

            if (!blob) {
                console.error("Canvas conversion failed.");
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `${filename}.${extension}`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

        }, format);

    });
}

document.addEventListener("DOMContentLoaded", init);