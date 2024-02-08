import html from "./index.html";

let connections = 0;

export default {
	async fetch(request, env) {
        const isRoot = new URL(request.url).pathname === "/";
		if (!isRoot) return new Response("Not found", { status: 404 });

        const { searchParams } = new URL(request.url);
        const delay = searchParams.has("delay") ? parseInt(searchParams.get("delay")) : 1000;

        const isWebSocket = request.headers.get("upgrade") === "websocket";
		if (!isWebSocket) {
            return new Response(
                html.replace("{{DELAY}}", delay).replace("{{WS_URL}}", request.url.replace("http", "ws")),
                { status: 200, headers: { "content-type": "text/html" }});
        }

		connections++;
		console.log(`${new Date().toISOString()} worker: new connection (delay ${delay}ms); now ${connections}`);

        // simulate figuring out which DO to use
		if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));

		const id = env.DO.idFromName("default");
		const stub = env.DO.get(id);
		const response = await stub.fetch(request);

		connections--;
		console.log(`${new Date().toISOString()} worker: connected; now ${connections}`);

		return response;
	},

};

export class DO {
	constructor(state, env) {
        this.env = env;
        this.websockets = new Set();
        setInterval(() => {
            const emoji = String.fromCodePoint(0x1F600 + Math.floor(Math.random() * 69));
            for (const ws of this.websockets) {
                ws.send(emoji);
            }
        }, 1000);
	}

	async fetch(request) {
        const {0: clientSocket, 1: serverSocket} = new WebSocketPair();
        serverSocket.accept();
        serverSocket.addEventListener("message", () => {
            serverSocket.close(1000, "OK");
        });
        serverSocket.addEventListener("close", () => {
            this.websockets.delete(serverSocket);
            console.log(`${new Date().toISOString()} DO: websocket closed; now ${this.websockets.size}`);
        });
        this.websockets.add(serverSocket);
        console.log(`${new Date().toISOString()} DO: new websocket; now ${this.websockets.size}`);
        return new Response(null, { status: 101, webSocket: clientSocket });
	}
}
