    precision mediump float;

    const float TWO_PI = 2.0 * 3.141592653589793;
    const float EPSILON = 1e-6;

    uniform vec2 u_resolution;
    uniform vec4 u_data;       // chi, omega, A, s
    uniform vec2 u_geometryA;  // W, H
    uniform vec3 u_geometryB;  // x0, y0, scale
    uniform vec2 u_support;    // R, r
    uniform vec4 u_resez;      // alfa, betta, gamma, ro

    float f(float x, float alfa, float betta, float gamma, float ro) {
        alfa -= gamma;
        betta += gamma;

        if (x != x) {
          return 0.0;
        }

        if (x < -(ro * sin(betta))) {
            return -x * tan(betta) + ro * (1.0 - 1.0 / cos(betta));
        } else if (x < ro * sin(alfa)) {
            return ro * (1.0 - sqrt(1.0 - (x / ro) * (x / ro)));
        } else {
            return x * tan(alfa) + ro * (1.0 - 1.0 / cos(alfa));
        }
    }

    float dist(float x, float y, float x0, float y0) {
        return sqrt((x - x0) * (x - x0) + (y - y0) * (y - y0));
    }

    float lenQ(float x, float y, float x0, float y0, float R) {
        return R - dist(x, y, x0, y0);
    }

    float fiQ(float x, float y, float x0, float y0) {
        float L = dist(x, y, x0, y0);
        if (L < EPSILON) return 0.0;

        float arg = (x - x0) / L;
        arg = arg > 1.0 ? 1.0 : arg;
        arg = arg < -1.0 ? -1.0 : arg;

        float ang = acos(arg);
        return (y - y0 < 0.0 ? (TWO_PI - ang) : ang);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;

        

        float W = u_geometryA.x;
        float H = u_geometryA.y;
        float x0 = u_geometryB.x;
        float y0 = u_geometryB.y;
        float scale = u_geometryB.z;

        float chi = u_data.x;
        float omega = u_data.y;
        float A = u_data.z;
        float s = u_data.w;

        float R = u_support.x;
        float r = u_support.y;
        const int mk = 10;

        float alfa = u_resez.x;
        float betta = u_resez.y;
        float gamma = u_resez.z;
        float ro = u_resez.w;

        float x = (uv.x * W - W / 2.0) * scale;
        float y = (uv.y * H - H / 2.0) * scale;

        float L = lenQ(x, y, x0, y0, R);
        float fi = fiQ(x, y, x0, y0);

        float lambda = L - (fi * s) / (TWO_PI);
        float Amin = 1.0;

        if (L >= 0.0 && L <= (R - r)) {
            int ns = int(L / s);
            //Amin = -0.05;
            for (int k = -mk; k <= mk; k++) { 
                int kk = ns + k; 
                float kpi = float(kk) * TWO_PI;
                float kkfi = fi + kpi;
                float psi = (kkfi * chi) / omega;
                float K = A * sin(psi);
                
                float ff = f(lambda - float(kk) * s + K * sin(gamma), alfa, betta, gamma, ro);
                float pp = K * cos(gamma);
                float Amp = ff + pp;
                
                bool isNaN = (Amp != Amp);
                bool isInf = (Amp != 0.0 && Amp * 2.0 == Amp);
                if(L > (R - r)*0.5) {
                  Amin = -1.1;
                } else if (Amp < Amin) {
                  Amin = Amp;
                }
            }
        } else {
            Amin = 1.0;
        }

        float normalized = (Amin + 0.001) * 100.0; // Нормализация
        gl_FragColor = vec4(normalized, normalized, normalized, 1.0);
    }