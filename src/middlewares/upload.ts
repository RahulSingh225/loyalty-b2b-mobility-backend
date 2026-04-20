import multer from 'multer';
import path from 'path';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter for KYC documents
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, PDF, and WEBP files are allowed.'));
    }
};

// File filter for ticket images (only images, no PDFs)
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and WEBP images are allowed.'));
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

// Multer configuration for ticket images
const ticketImageUpload = multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

export const uploadSingle = upload.single('document');
export const uploadMultiple = upload.array('documents', 5);
export const uploadTicketImage = ticketImageUpload.single('image');
export const uploadProfilePhoto = upload.single('profile-photo');

// For bulk KYC uploads where field names represent document types
// Accepts any field names with max 5 files total
export const uploadAnyFields = upload.any();

