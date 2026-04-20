import { Request, Response } from 'express';
import { creativeService } from '../services/creative.service';
import { success } from '../utils/response';
import { log } from 'console';

export const listCreatives = async (req: Request, res: Response) => {
    const user = (req as any).user;
    // console.log(`Creatives${JSON.stringify(user)}`);
    
    let result = await creativeService.listCreativesForUser(user?.id, user?.roleId);
// console.log(`RESULT${JSON.stringify(result)}`);

    const { S3Connector } = await import('../connectors/s3Connector');
    const s3 = new S3Connector();
    for (const c of result) {
        try {
            if (!c.url || c.url.startsWith('http')) continue;

            let key = c.url;
            if (key.startsWith('s3://')) {
                const parts = key.split('/');
                key = parts.slice(3).join('/'); 
            } else if (!key.includes('/')) {
                // If it's just a filename, assume standard creative path
                key = 'img/creatives/' + key;
            }

            c.url = await s3.getSignedUrl(key);
        } catch (error) {
            console.error('Error generating signed URL for creative:', error);
        }
    }
    // console.log(`RESULT with URLs${JSON.stringify(result)}`);
    res.json(success(result));
};
