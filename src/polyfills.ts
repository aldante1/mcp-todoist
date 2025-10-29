// Polyfills for Node.js compatibility with FastMCP

// Add File global if not available
if (typeof global.File === 'undefined') {
  // @ts-ignore
  global.File = class File {
    public name: string;
    public size: number;
    public type: string;
    public lastModified: number;
    
    constructor(bits: any[], name: string, options: { type?: string } = {}) {
      this.name = name;
      this.size = bits.reduce((acc: number, bit: any) => acc + (bit?.length || 0), 0);
      this.type = options.type || '';
      this.lastModified = Date.now();
    }
  };
}

// Add Blob global if not available
if (typeof global.Blob === 'undefined') {
  // @ts-ignore
  global.Blob = class Blob {
    public size: number;
    public type: string;
    
    constructor(bits: any[], options: { type?: string } = {}) {
      this.size = bits.reduce((acc: number, bit: any) => acc + (bit?.length || 0), 0);
      this.type = options.type || '';
    }
  };
}

// Add FormData global if not available
if (typeof global.FormData === 'undefined') {
  // @ts-ignore
  global.FormData = class FormData {
    private data: Map<string, any> = new Map();
    
    append(name: string, value: any, fileName?: string) {
      this.data.set(name, { value, fileName });
    }
    
    get(name: string) {
      return this.data.get(name);
    }
    
    has(name: string) {
      return this.data.has(name);
    }
    
    delete(name: string) {
      this.data.delete(name);
    }
  };
}

// Add fetch global if not available (Node.js 18+ has it, but just in case)
if (typeof global.fetch === 'undefined') {
  // Import undici fetch if available
  try {
    const { fetch } = require('undici');
    global.fetch = fetch;
  } catch (e) {
    // Fallback: basic fetch implementation
    global.fetch = async (input: any, init?: any) => {
      throw new Error('Fetch not available in this environment');
    };
  }
}

// Add Headers global if not available
if (typeof global.Headers === 'undefined') {
  // @ts-ignore
  global.Headers = class Headers {
    private headers: Map<string, string> = new Map();
    
    constructor(init?: any) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([name, value]) => this.headers.set(name, value));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([name, value]) => this.headers.set(name, String(value)));
        }
      }
    }
    
    append(name: string, value: string) {
      this.headers.set(name, value);
    }
    
    delete(name: string) {
      this.headers.delete(name);
    }
    
    get(name: string) {
      return this.headers.get(name) || null;
    }
    
    has(name: string) {
      return this.headers.has(name);
    }
    
    set(name: string, value: string) {
      this.headers.set(name, value);
    }
    
    entries() {
      return this.headers.entries();
    }
  };
}

// Add Request global if not available
if (typeof global.Request === 'undefined') {
  // @ts-ignore
  global.Request = class Request {
    public url: string;
    public method: string;
    public headers: Headers;
    public body: any;
    
    constructor(input: any, init?: any) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
    }
  };
}

// Add Response global if not available
if (typeof global.Response === 'undefined') {
  // @ts-ignore
  global.Response = class Response {
    public body: any;
    public status: number;
    public statusText: string;
    public headers: Headers;
    
    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Headers(init?.headers);
    }
    
    async text() {
      return this.body ? this.body.toString() : '';
    }
    
    async json() {
      const text = await this.text();
      return JSON.parse(text);
    }
  };
}

export {};
