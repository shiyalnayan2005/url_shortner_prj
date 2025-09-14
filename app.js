import { readFile, writeFile } from 'fs/promises';
import { createServer } from 'http';
import path from 'path';
import crypto from 'crypto';

const PORT = 3000;
const DATA_FILE_PATH = path.join('data', 'links.json');

const serveFile = async (res, filePath, contentType) => {
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type" : contentType });
        res.end(data);
    } catch (error) {
        res.writeHead(404, { "Content-Type" : contentType });
        res.end("404 page not found");
    }
}

const getLinks = async () => {
    try {
        const data = await readFile(DATA_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // console.log("\nFile not exist !");
            await writeFile(DATA_FILE_PATH, JSON.stringify({}));
            // console.log("\nAuto file created successfully...");
            return {};
        }
        throw error;
    }
}

const saveLinks = async (links) => {
    await writeFile(DATA_FILE_PATH, JSON.stringify(links));
}

const server = createServer(async (req, res) => {
    switch (req.method) {
        case 'GET':
            switch (req.url) {
                case "/": 
                    return serveFile(res, path.join("public", 'index.html'), 'text/html');
                case "/style.css": 
                    return serveFile(res, path.join("public", 'style.css'), 'text/css');
                case '/links':
                    return serveFile(res, DATA_FILE_PATH, 'application/json');
                default: 
                    const links = await getLinks();
                    const shortCode = req.url.slice(1); // remove starting '/' from request url
                    if (links[shortCode]) {
                        res.writeHead(302, {location : links[shortCode]});
                        return res.end();
                    }

                    res.writeHead(404, { "Content-Type" : 'text/html' });
                    return res.end("404 page not found");
            }
            break;

        case 'POST':
            switch (req.url) {
                case '/shorten':
                    const links = await getLinks();

                    let body = "";
                    req.on('data', (chunk) => (body += chunk));

                    req.on('end', async () => {
                        const {url, shortCode} = JSON.parse(body);

                        if (!url) {
                            res.writeHead(400, {'Content-Type' : 'text/plain'});
                            return res.end('URL is required !');
                        }

                        const finalShortCode = shortCode.split(' ').join('_') || crypto.randomBytes(4).toString('hex');

                        if (links[finalShortCode]) {
                            res.writeHead(400, {'Content-Type' : 'application/json'});
                            return res.end('Short code already exist. Please choose another.');
                        }

                        links[finalShortCode] = url;

                        await saveLinks(links);
                        res.writeHead(200, {'Content-Type' : 'application/json'});
                        return res.end(JSON.stringify({success: true, shortCode: finalShortCode}));
                    })
                    break;
            
                default: 
                    res.writeHead(404, { "Content-Type" : 'text/html' });
                    res.end("404 page not found");
                    break;
            }
    
        default: break;
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});