using System;
using System.IO;
using System.Threading.Tasks;
using System.Drawing;
using System.Drawing.Imaging;
using VRTranslation.SDK;

namespace VRTranslation.Examples
{
    /// <summary>
    /// VR Translation Service C# 集成示例
    /// 
    /// 演示如何使用C# SDK调用VR翻译服务的各种功能：
    /// - 文本翻译
    /// - 批量翻译  
    /// - OCR识别
    /// - OCR识别后翻译
    /// - WebSocket实时通信
    /// - 服务监控
    /// 
    /// 运行前请确保:
    /// 1. VR翻译服务已启动 (npm run dev)
    /// 2. 安装NuGet包: System.Drawing.Common
    /// </summary>
    class TranslationExample
    {
        private VRTranslateSDK sdk;

        public TranslationExample()
        {
            sdk = new VRTranslateSDK(
                baseUrl: "http://localhost:8080",
                websocketUrl: "ws://localhost:8081",
                debug: true
            );
        }

        /// <summary>
        /// 演示文本翻译功能
        /// </summary>
        public async Task DemoTextTranslationAsync()
        {
            Console.WriteLine("\n" + new string('=', 60));
            Console.WriteLine("🌐 文本翻译演示");
            Console.WriteLine(new string('=', 60));

            // 单个文本翻译示例
            var textsToTranslate = new[]
            {
                ("Hello World!", "en", "zh-CN"),
                ("Good morning", "en", "zh-CN"),
                ("你好世界", "zh-CN", "en"),
                ("こんにちは", "ja", "zh-CN"),
                ("Bonjour le monde", "fr", "zh-CN")
            };

            foreach (var (text, sourceLang, targetLang) in textsToTranslate)
            {
                try
                {
                    Console.WriteLine($"\n📝 翻译: '{text}' ({sourceLang} → {targetLang})");
                    var result = await sdk.TranslateAsync(text, sourceLang, targetLang);

                    Console.WriteLine($"   原文: {result.Original}");
                    Console.WriteLine($"   译文: {result.Translation}");
                    Console.WriteLine($"   语言: {result.SourceLang} → {result.TargetLang}");
                    Console.WriteLine($"   时间: {result.Timestamp:yyyy-MM-dd HH:mm:ss}");
                }
                catch (Exception e)
                {
                    Console.WriteLine($"   ❌ 翻译失败: {e.Message}");
                }
            }
        }

        /// <summary>
        /// 演示批量翻译功能
        /// </summary>
        public async Task DemoBatchTranslationAsync()
        {
            Console.WriteLine("\n" + new string('=', 60));
            Console.WriteLine("📦 批量翻译演示");
            Console.WriteLine(new string('=', 60));

            // 准备批量翻译的文本
            var texts = new[]
            {
                "Welcome to our VR translation service",
                "This is a powerful translation API",
                "It supports multiple languages",
                "Real-time translation is available",
                "WebSocket communication is supported"
            };

            try
            {
                Console.WriteLine($"\n📦 批量翻译 {texts.Length} 条文本...");
                var result = await sdk.BatchTranslateAsync(texts, "en", "zh-CN");

                Console.WriteLine($"   总数: {result.Total}");
                Console.WriteLine($"   成功: {result.Successful}");
                Console.WriteLine($"   失败: {result.Failed}");
                Console.WriteLine("   结果:");

                foreach (var item in result.Results)
                {
                    if (item.Success)
                    {
                        Console.WriteLine($"   {item.Index + 1}. {item.Original} → {item.Translation}");
                    }
                    else
                    {
                        Console.WriteLine($"   {item.Index + 1}. {item.Original} → [错误: {item.Error}]");
                    }
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"   ❌ 批量翻译失败: {e.Message}");
            }
        }

        /// <summary>
        /// 演示OCR识别功能
        /// </summary>
        public async Task DemoOCRRecognitionAsync()
        {
            Console.WriteLine("\n" + new string('=', 60));
            Console.WriteLine("📷 OCR识别演示");
            Console.WriteLine(new string('=', 60));

            try
            {
                // 创建一个示例图片（实际使用中应该是真实图片）
                var imageBytes = CreateTextImage("Hello OCR World!", 400, 100);

                Console.WriteLine("📷 OCR识别测试图片...");
                var result = await sdk.OCRAsync(imageBytes);

                Console.WriteLine($"   识别文字: {result.Text}");
                Console.WriteLine($"   识别语言: {result.Language}");
                Console.WriteLine($"   识别时间: {result.Timestamp:yyyy-MM-dd HH:mm:ss}");

                // OCR识别后翻译
                Console.WriteLine("\n🔍➡️📝 OCR识别后翻译...");
                var translateResult = await sdk.OCRTranslateAsync(imageBytes, "en", "zh-CN");

                Console.WriteLine($"   原文: {translateResult.Original}");
                Console.WriteLine($"   译文: {translateResult.Translation}");
                Console.WriteLine($"   语言: {translateResult.SourceLang} → {translateResult.TargetLang}");
                Console.WriteLine($"   时间: {translateResult.Timestamp:yyyy-MM-dd HH:mm:ss}");
            }
            catch (Exception e)
            {
                Console.WriteLine($"   ❌ OCR处理失败: {e.Message}");
            }
        }

        /// <summary>
        /// 创建包含文本的示例图片
        /// </summary>
        /// <param name="text">要绘制的文本</param>
        /// <param name="width">图片宽度</param>
        /// <param name="height">图片高度</param>
        /// <returns>图片字节数组</returns>
        private byte[] CreateTextImage(string text, int width, int height)
        {
            try
            {
                using (var bitmap = new Bitmap(width, height))
                using (var graphics = Graphics.FromImage(bitmap))
                using (var font = new Font("Arial", 16, FontStyle.Regular))
                using (var brush = new SolidBrush(Color.Black))
                using (var stream = new MemoryStream())
                {
                    // 设置背景色
                    graphics.Clear(Color.White);

                    // 设置文本渲染质量
                    graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAlias;

                    // 计算文本位置（居中）
                    var textSize = graphics.MeasureString(text, font);
                    var x = (width - textSize.Width) / 2;
                    var y = (height - textSize.Height) / 2;

                    // 绘制文本
                    graphics.DrawString(text, font, brush, x, y);

                    // 保存为PNG格式
                    bitmap.Save(stream, ImageFormat.Png);
                    return stream.ToArray();
                }
            }
            catch (Exception)
            {
                // 如果图片创建失败，返回一个最小的PNG图片
                return Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==");
            }
        }

        /// <summary>
        /// 演示WebSocket实时通信
        /// </summary>
        public async Task DemoWebSocketCommunicationAsync()
        {
            Console.WriteLine("\n" + new string('=', 60));
            Console.WriteLine("⚡ WebSocket实时通信演示");
            Console.WriteLine(new string('=', 60));

            try
            {
                // 连接WebSocket
                Console.WriteLine("🔌 连接WebSocket服务器...");
                await sdk.ConnectWebSocketAsync();

                // 设置消息监听器
                sdk.OnWebSocketMessage("translation_result", message =>
                {
                    Console.WriteLine($"📥 收到翻译结果: {message.Payload}");
                });

                sdk.OnWebSocketMessage("system", message =>
                {
                    Console.WriteLine($"📥 收到系统消息: {message.Payload}");
                });

                // 发送不同类型的消息
                Console.WriteLine("\n👁️ 发送眼动数据...");
                await sdk.SendGazeDataAsync(new
                {
                    x = 150,
                    y = 250,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    confidence = 0.92
                });

                Console.WriteLine("📷 发送截图请求...");
                await sdk.SendScreenshotAsync(new
                {
                    image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                    sourceLang = "en",
                    targetLang = "zh-CN"
                });

                Console.WriteLine("⚙️ 发送配置更新...");
                await sdk.SendConfigAsync(new
                {
                    gaze = new
                    {
                        threshold = 2.5,
                        radius = 60
                    },
                    translation = new
                    {
                        sourceLanguage = "en",
                        targetLanguage = "zh-CN"
                    }
                });

                // 等待消息响应
                Console.WriteLine("⏳ 等待消息响应...");
                await Task.Delay(3000);
            }
            catch (Exception e)
            {
                Console.WriteLine($"❌ WebSocket通信失败: {e.Message}");
            }
            finally
            {
                await sdk.DisconnectWebSocketAsync();
                Console.WriteLine("🔌 WebSocket连接已断开");
            }
        }

        /// <summary>
        /// 演示服务监控功能
        /// </summary>
        public async Task DemoServiceMonitoringAsync()
        {
            Console.WriteLine("\n" + new string('=', 60));
            Console.WriteLine("📊 服务监控演示");
            Console.WriteLine(new string('=', 60));

            try
            {
                // 获取支持的语言列表
                Console.WriteLine("🌍 获取支持的语言...");
                var languages = await sdk.GetLanguagesAsync();

                Console.WriteLine($"   常用语言: {languages.Common.Count} 种");
                var displayCount = Math.Min(5, languages.Common.Count);
                for (int i = 0; i < displayCount; i++)
                {
                    var lang = languages.Common[i];
                    Console.WriteLine($"   - {lang.Code}: {lang.Name} ({lang.NativeName})");
                }

                if (languages.Common.Count > 5)
                {
                    Console.WriteLine($"   ... 和其他 {languages.Common.Count - 5} 种语言");
                }

                // 获取服务统计信息
                Console.WriteLine("\n📈 获取服务统计...");
                var stats = await sdk.GetStatsAsync();

                var service = stats.Service;
                var performance = stats.Performance;
                var features = stats.Features;
                var limits = stats.Limits;

                Console.WriteLine($"   服务名称: {service.Name}");
                Console.WriteLine($"   服务版本: {service.Version}");
                Console.WriteLine($"   运行状态: {service.Status}");
                Console.WriteLine($"   运行时间: {service.Uptime:F1} 秒");

                Console.WriteLine($"   响应时间: {performance.ResponseTime}");

                Console.WriteLine("   功能支持:");
                Console.WriteLine($"   - 文本翻译: {(features.TextTranslation ? "✅" : "❌")}");
                Console.WriteLine($"   - OCR识别: {(features.OcrRecognition ? "✅" : "❌")}");
                Console.WriteLine($"   - 批量翻译: {(features.BatchTranslation ? "✅" : "❌")}");
                Console.WriteLine($"   - WebSocket支持: {(features.WebsocketSupport ? "✅" : "❌")}");
                Console.WriteLine($"   - 多语言支持: {(features.MultiLanguage ? "✅" : "❌")}");

                Console.WriteLine("   服务限制:");
                Console.WriteLine($"   - 最大文本长度: {limits.MaxTextLength} 字符");
                Console.WriteLine($"   - 批量处理大小: {limits.MaxBatchSize} 条");
                Console.WriteLine($"   - 最大图片大小: {limits.MaxImageSize}");
                Console.WriteLine($"   - 速率限制: {limits.RateLimit}");
            }
            catch (Exception e)
            {
                Console.WriteLine($"❌ 获取服务信息失败: {e.Message}");
            }
        }

        /// <summary>
        /// 运行完整演示
        /// </summary>
        public async Task RunComprehensiveDemoAsync()
        {
            Console.WriteLine("🚀 VR翻译服务 C# SDK 综合演示");
            Console.WriteLine(new string('=', 80));

            try
            {
                // 执行所有演示
                await DemoServiceMonitoringAsync();
                await DemoTextTranslationAsync();
                await DemoBatchTranslationAsync();
                await DemoOCRRecognitionAsync();
                await DemoWebSocketCommunicationAsync();

                Console.WriteLine("\n" + new string('=', 80));
                Console.WriteLine("✅ 所有演示完成！VR翻译服务功能正常。");
                Console.WriteLine(new string('=', 80));
            }
            catch (Exception e)
            {
                Console.WriteLine($"\n❌ 演示过程中出现错误: {e.Message}");
                Console.WriteLine("请确保VR翻译服务已启动 (npm run dev)");
            }
        }

        /// <summary>
        /// 交互模式
        /// </summary>
        public async Task InteractiveModeAsync()
        {
            Console.WriteLine("\n🎯 进入交互模式 (输入 'quit' 退出)");
            Console.WriteLine(new string('-', 40));

            while (true)
            {
                try
                {
                    Console.Write("\n请输入要翻译的文本: ");
                    var text = Console.ReadLine()?.Trim();

                    if (string.IsNullOrEmpty(text) || text.ToLower() == "quit" || text.ToLower() == "exit" || text.ToLower() == "q")
                    {
                        Console.WriteLine("👋 再见！");
                        break;
                    }

                    Console.Write("源语言 (默认 auto): ");
                    var sourceLang = Console.ReadLine()?.Trim();
                    if (string.IsNullOrEmpty(sourceLang))
                        sourceLang = "auto";

                    Console.Write("目标语言 (默认 zh-CN): ");
                    var targetLang = Console.ReadLine()?.Trim();
                    if (string.IsNullOrEmpty(targetLang))
                        targetLang = "zh-CN";

                    Console.WriteLine("\n🔄 翻译中...");
                    var result = await sdk.TranslateAsync(text, sourceLang, targetLang);

                    Console.WriteLine("✅ 翻译结果:");
                    Console.WriteLine($"   原文: {result.Original}");
                    Console.WriteLine($"   译文: {result.Translation}");
                    Console.WriteLine($"   语言: {result.SourceLang} → {result.TargetLang}");
                }
                catch (Exception e)
                {
                    Console.WriteLine($"❌ 翻译失败: {e.Message}");
                }
            }
        }

        /// <summary>
        /// 资源清理
        /// </summary>
        public void Dispose()
        {
            sdk?.Dispose();
        }
    }

    /// <summary>
    /// 程序入口点
    /// </summary>
    class Program
    {
        static async Task Main(string[] args)
        {
            var example = new TranslationExample();

            try
            {
                // 检查命令行参数
                if (args.Length > 0 && (args[0] == "--interactive" || args[0] == "-i"))
                {
                    await example.InteractiveModeAsync();
                }
                else
                {
                    await example.RunComprehensiveDemoAsync();
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"程序运行出错: {e.Message}");
                Console.WriteLine("请确保VR翻译服务已启动 (npm run dev)");
            }
            finally
            {
                example.Dispose();
            }

            Console.WriteLine("\n按任意键退出...");
            Console.ReadKey();
        }
    }
}

/*
编译和运行说明:

1. 创建新的 C# 控制台项目:
   dotnet new console -n VRTranslationExample
   cd VRTranslationExample

2. 添加必要的NuGet包:
   dotnet add package System.Drawing.Common
   dotnet add package System.Text.Json

3. 将此文件内容替换 Program.cs

4. 将 VRTranslateSDK.cs 文件复制到项目目录

5. 运行项目:
   dotnet run                    # 运行完整演示
   dotnet run -- --interactive   # 进入交互模式

运行前请确保VR翻译服务已启动:
   cd path/to/vr-translate/backend
   npm run dev
*/