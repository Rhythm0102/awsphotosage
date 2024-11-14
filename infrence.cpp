#include <iostream>
#include <string>
#include <vector>
#include <filesystem>
#include <fstream>
#include <unistd.h>
#include <sys/wait.h>
#include <algorithm>

// Function to execute a shell command and return its output
std::string exec(const char* cmd) {
    char buffer[128];
    std::string result = "";
    FILE* pipe = popen(cmd, "r");
    if (!pipe) throw std::runtime_error("popen() failed!");
    try {
        while (!feof(pipe)) {
            if (fgets(buffer, 128, pipe) != NULL)
                result += buffer;
        }
    } catch (...) {
        pclose(pipe);
        throw;
    }
    pclose(pipe);
    return result;
}


bool commandExists(const std::string& command) {
    return exec(("which " + command).c_str()).find(command) != std::string::npos;
}


void printUsage() {
    std::cout << "Usage:\n";
    std::cout << "  ./server-llm [--port] [--repo] [--wtype] [--backend] [--gpu-id] [--n-parallel] [--n-kv] [--verbose] [-non-interactive]\n\n";
    std::cout << "  --port:             port number, default is 8888\n";
    std::cout << "  --repo:             path to a repo containing GGUF model files\n";
    std::cout << "  --wtype:            weights type (f16, q8_0, q4_0, q4_1), default is user-input\n";
    std::cout << "  --backend:          cpu, cuda, metal, depends on the OS\n";
    std::cout << "  --gpu-id:           gpu id, default is 0\n";
    std::cout << "  --n-parallel:       number of parallel requests, default is 8\n";
    std::cout << "  --n-kv:             KV cache size, default is 4096\n";
    std::cout << "  --verbose:          verbose output\n\n";
    std::cout << "  --non-interactive:  run without asking a permission to run\n";
    std::cout << "Example:\n\n";
    std::cout << "  ./server-llm --repo https://huggingface.co/TheBloke/Llama-2-7B-GGUF --wtype q8_0\n\n";
}

bool downloadFile(const std::string& url, const std::string& filename) {
    std::string cmd = "curl -o \"" + filename + "\" -# -L \"" + url + "\"";
    int result = system(cmd.c_str());
    return result == 0;
}


bool fileExists(const std::string& filename) {
    std::ifstream f(filename.c_str());
    return f.good();
}


bool createDirectory(const std::string& path) {
    return std::filesystem::create_directories(path);
}

// Function to change the current working directory
bool changeDirectory(const std::string& path) {
    return chdir(path.c_str()) == 0;
}

// Function to run a command in a separate process
void runCommand(const std::string& cmd) {
    if (system(cmd.c_str()) != 0) {
        std::cerr << "[-] Error executing command: " << cmd << "\n";
        exit(1);
    }
}

int main(int argc, char *argv[]) {
    // Required utils: curl, git, make
    if (!commandExists("curl")) {
        std::cerr << "[-] curl not found\n";
        return 1;
    }
    if (!commandExists("git")) {
        std::cerr << "[-] git not found\n";
        return 1;
    }
    if (!commandExists("make")) {
        std::cerr << "[-] make not found\n";
        return 1;
    }

    // Parse arguments
    bool isInteractive = true;
    int port = 8888;
    std::string repo = "";
    std::string wtype = "";
    std::string backend = "cpu";
    // Determine default backend based on OS
#ifdef __APPLE__
    backend = "metal";
#else
    if (commandExists("nvcc")) {
        backend = "cuda";
    }
#endif 
    int gpuId = 0;
    int nParallel = 8;
    int nKv = 4096;
    bool verbose = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--non-interactive") {
            isInteractive = false;
        } else if (arg == "--port") {
            if (i + 1 < argc) {
                port = std::stoi(argv[++i]);
            } else {
                std::cerr << "[-] Missing value for --port\n";
                printUsage();
                return 1;
            }
        } else if (arg == "--repo") {
            if (i + 1 < argc) {
                repo = argv[++i];
            } else {
                std::cerr << "[-] Missing value for --repo\n";
                printUsage();
                return 1;
            }
        } else if (arg == "--wtype") {
            if (i + 1 < argc) {
                wtype = argv[++i];
            } else {
                std::cerr << "[-] Missing value for --wtype\n";
                printUsage();
                return 1;
            }
        } else if (arg == "--backend") {
            if (i + 1 < argc) {
                backend = argv[++i];
            } else {
                std::cerr << "[-] Missing value for --backend\n";
                printUsage();
                return 1;
            }
        } else if (arg == "--gpu-id") {
            if (i + 1 < argc) {
                gpuId = std::stoi(argv[++i]);
            } else {
                std::cerr << "[-] Missing value for --gpu-id\n";
                printUsage();
                return 1;
            }
        } else if (arg == "--n-parallel") {
            if (i + 1 < argc) {
                nParallel = std::stoi(argv[++i]);
            } else {
                std::cerr << "[-] Missing value for --n-parallel\n";
                printUsage();
                return 1;
            }
        } else if (arg == "--n-kv") {
            if (i + 1 < argc) {
                nKv = std::stoi(argv[++i]);
            } else {
                std::cerr << "[-] Missing value for --n-kv\n";
                printUsage();
                return 1;
            }
        } else if (arg == "--verbose") {
            verbose = true;
        } else if (arg == "--help") {
            printUsage();
            return 0;
        } else {
            std::cerr << "[-] Unknown argument: " << arg << "\n";
            printUsage();
            return 1;
        }
    }

    // Available weights types
    std::vector<std::string> wtypes = {
        "F16", "Q8_0", "Q4_0", "Q4_1", "Q5_0", "Q5_1", "Q6_K", 
        "Q5_K_M", "Q5_K_S", "Q4_K_M", "Q4_K_S", "Q3_K_L", 
        "Q3_K_M", "Q3_K_S", "Q2_K"
    };

    // Sample repos
    std::vector<std::string> repos = {
        "https://huggingface.co/TheBloke/Llama-2-7B-GGUF",
        "https://huggingface.co/TheBloke/Llama-2-13B-GGUF",
        "https://huggingface.co/TheBloke/Llama-2-70B-GGUF",
        "https://huggingface.co/TheBloke/CodeLlama-7B-GGUF",
        "https://huggingface.co/TheBloke/CodeLlama-13B-GGUF",
        "https://huggingface.co/TheBloke/CodeLlama-34B-GGUF",
        "https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF",
        "https://huggingface.co/TheBloke/zephyr-7B-beta-GGUF",
        "https://huggingface.co/TheBloke/OpenHermes-2-Mistral-7B-GGUF",
        "https://huggingface.co/TheBloke/CausalLM-7B-GGUF"
    };

    // Interactive mode introduction
    if (isInteractive) {
        std::cout << "\n";
        std::cout << "[I] This is a helper script for deploying llama.cpp's server on this machine.\n\n";
        std::cout << "    Based on the options that follow, the script might download a model file\n";
        std::cout << "    from the internet, which can be a few GBs in size. The script will also\n";
        std::cout << "    build the latest llama.cpp source code from GitHub, which can be unstable.\n";
        std::cout << "\n";
        std::cout << "    Upon success, an HTTP server will be started and it will serve the selected\n";
        std::cout << "    model using llama.cpp for demonstration purposes.\n";
        std::cout << "\n";
        std::cout << "    Please note:\n";
        std::cout << "\n";
        std::cout << "    - All new data will be stored in the current folder\n";
        std::cout << "    - The server will be listening on all network interfaces\n";
        std::cout << "    - The server will run with default settings which are not always optimal\n";
        std::cout << "    - Do not judge the quality of a model based on the results from this script\n";
        std::cout << "    - Do not use this script to benchmark llama.cpp\n";
        std::cout << "    - Do not use this script in production\n";
        std::cout << "    - This script is only for demonstration purposes\n";
        std::cout << "\n";
        std::cout << "    If you don't know what you are doing, please press Ctrl-C to abort now\n";
        std::cout << "\n";
        std::cout << "    Press Enter to continue ...\n\n";

        std::cin.get(); 
    }

    // Repo selection
    if (repo.empty()) {
        std::cout << "[+] No repo provided from the command line\n";
        std::cout << "    Please select a number from the list below or enter an URL:\n\n";

        for (size_t i = 0; i < repos.size(); ++i) {
            std::cout << "    " << (i + 1) << ") " << repos[i] << "\n";
        }

        while (repo.empty()) {
            std::cout << "\n    Or choose one from: https://huggingface.co/models?sort=trending&search=gguf\n\n";
            std::cout << "[+] Select repo: ";
            std::cin >> repo;

            if (isdigit(repo[0])) {
                int repoIndex = std::stoi(repo) - 1;
                if (repoIndex >= 0 && repoIndex < repos.size()) {
                    repo = repos[repoIndex];
                } else {
                    std::cerr << "[-] Invalid repo index: " << repo << "\n";
                    repo = "";
                }
            } else if (repo.substr(0, 4) == "http") {
                // Valid URL, do nothing
            } else {
                std::cerr << "[-] Invalid repo URL: " << repo << "\n";
                repo = "";
            }
        }
    }

    // Remove suffix from repo URL
    repo = repo.substr(0, repo.find("/tree/main"));


    // ... (Get Model Files from Repo - Requires HTML parsing or HuggingFace API) ...
    // Assuming you have a function called `getModelFilesFromRepo` that returns a 
    // vector of filenames based on the `repo` URL

    std::vector<std::string> modelFiles = getModelFilesFromRepo(repo);

    std::cout << "[+] Model files:\n\n";

    std::vector<std::string> wfiles(wtypes.size(), "");

    for (const auto& file : modelFiles) {
        int iw = -1;
        for (size_t i = 0; i < wtypes.size(); ++i) {
            std::string ufile = file;
            std::transform(ufile.begin(), ufile.end(), ufile.begin(), ::toupper);
            if (ufile.find(wtypes[i]) != std::string::npos) {
                iw = i;
                break;
            }
        }

        if (iw == -1) continue; 

        wfiles[iw] = file;

        char have = ' ';
        if (fileExists(file)) {
            have = '*';
        }

        std::cout << "    " << (iw + 1) << ") " << have << " " << file << "\n";
    }

    // Weight type selection
    if (wtype.empty()) {
        int wtypeIndex = -1;
        while (wtypeIndex == -1) {
            std::cout << "\n[+] Select weight type: ";
            std::cin >> wtype;

            if (isdigit(wtype[0])) {
                wtypeIndex = std::stoi(wtype) - 1;
                if (wtypeIndex < 0 || wtypeIndex >= wfiles.size() || wfiles[wtypeIndex].empty()) {
                    std::cerr << "[-] Invalid weight type index: " << wtype << "\n";
                    wtypeIndex = -1;
                }
            } else {
                std::cerr << "[-] Invalid weight type: " << wtype << "\n";
            }
        }

        wtype = wtypes[wtypeIndex];
    } else {
        // Check if provided wtype is valid
        int wtypeIndex = -1;
        for (size_t i = 0; i < wtypes.size(); ++i) {
            if (wtypes[i] == wtype) {
                wtypeIndex = i;
                break;
            }
        }

        if (wtypeIndex == -1 || wfiles[wtypeIndex].empty()) {
            std::cerr << "[-] Invalid weight type: " << wtype << "\n";
            return 1;
        }
    }
    

    std::string wfile = wfiles[std::find(wtypes.begin(), wtypes.end(), wtype) - wtypes.begin()];

    std::cout << "[+] Selected weight type: " << wtype << " (" << wfile << ")\n";

    std::string url = repo + "/resolve/main/" + wfile;

    // Download weights if necessary
    std::string chk = wfile + ".chk";
    bool doDownload = false;

    if (!fileExists(wfile)) {
        doDownload = true;
    } else if (!fileExists(chk)) {
        doDownload = true;
    } else {
        // ... (File modification time comparison to determine if download is needed) ...
        // This requires implementation using platform-specific functions like `stat`
    }

    if (doDownload) {
        std::cout << "[+] Downloading weights from " << url << "\n";
        if (!downloadFile(url, wfile)) {
            std::cerr << "[-] Error downloading weights\n";
            return 1;
        }

        // Create check file
        std::ofstream outfile(chk);
        outfile.close();
    } else {
        std::cout << "[+] Using cached weights " << wfile << "\n";
    }

    // Get latest llama.cpp and build
    std::string llamaCppDir = "__llama_cpp_port_" + std::to_string(port) + "__";

    if (std::filesystem::exists(llamaCppDir) && !fileExists(llamaCppDir + "/__ggml_script__")) {
        std::cerr << "[-] Directory " << llamaCppDir << " already exists\n";
        std::cerr << "[-] Please remove it and try again\n";
        return 1;
    } else if (std::filesystem::exists(llamaCppDir)) {
        std::cout << "[+] Directory " << llamaCppDir << " already exists\n";
        std::cout << "[+] Using cached llama.cpp\n";

        changeDirectory(llamaCppDir);
        runCommand("git reset --hard");
        runCommand("git fetch");
        runCommand("git checkout origin/master");

        changeDirectory("..");
    } else {
        std::cout << "[+] Cloning llama.cpp\n";
        runCommand("git clone https://github.com/ggerganov/llama.cpp " + llamaCppDir);
    }

    // Mark that the directory is made by this script
    std::ofstream outfile(llamaCppDir + "/__ggml_script__");
    outfile.close();

    // Build llama.cpp
    changeDirectory(llamaCppDir);

    runCommand("make clean");

    std::string log = "--silent";
    if (verbose) {
        log = "";
    }

    if (backend == "cuda") {
        std::cout << "[+] Building with CUDA backend\n";
        runCommand("GGML_CUDA=1 make -j llama-server " + log);
    } else if (backend == "cpu") {
        std::cout << "[+] Building with CPU backend\n";
        runCommand("make -j llama-server " + log);
    } else if (backend == "metal") {
        std::cout << "[+] Building with Metal backend\n";
        runCommand("make -j llama-server " + log);
    } else {
        std::cerr << "[-] Unknown backend: " << backend << "\n";
        return 1;
    }

    // Run the server
    std::cout << "[+] Running server\n";

    std::string args = "";
    if (backend == "cuda") {
        setenv("CUDA_VISIBLE_DEVICES", std::to_string(gpuId).c_str(), 1);
        args = "-ngl 999";
    } else if (backend == "cpu") {
        args = "-ngl 0";
    } else if (backend == "metal") {
        args = "-ngl 999";
    } else {
        std::cerr << "[-] Unknown backend: " << backend << "\n";
        return 1;
    }

    if (verbose) {
        args += " --verbose";
    }

    std::string serverCmd = "./llama-server -m \"../" + wfile + "\" --host 0.0.0.0 --port " + 
                           std::to_string(port) + " -c " + std::to_string(nKv) + 
                           " -np \"" + std::to_string(nParallel) + "\" " + args;
    
    runCommand(serverCmd); // This will keep the program running

    return 0;
}