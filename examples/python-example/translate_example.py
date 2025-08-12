#!/usr/bin/env python3
"""
VR Translation Service Python 集成示例

演示如何使用Python SDK调用VR翻译服务的各种功能：
- 文本翻译
- 批量翻译  
- OCR识别
- OCR识别后翻译
- WebSocket实时通信
- 服务监控

运行前请确保:
1. VR翻译服务已启动 (npm run dev)
2. 安装依赖: pip install aiohttp websockets pillow
"""

import asyncio
import base64
import time
from pathlib import Path
from PIL import Image
import io
import sys
import os

# 添加SDK路径
sys.path.append(os.path.join(os.path.dirname(__file__), '../../sdk/python'))
from vr_translate_sdk import VRTranslateSDK


class TranslationExample:
    """翻译服务示例类"""
    
    def __init__(self):
        self.sdk = VRTranslateSDK(
            base_url="http://localhost:8080",
            websocket_url="ws://localhost:8081",
            debug=True
        )
    
    async def demo_text_translation(self):
        """演示文本翻译功能"""
        print("\n" + "="*60)
        print("🌐 文本翻译演示")
        print("="*60)
        
        # 单个文本翻译
        texts_to_translate = [
            ("Hello World!", "en", "zh-CN"),
            ("Good morning", "en", "zh-CN"),
            ("你好世界", "zh-CN", "en"),
            ("こんにちは", "ja", "zh-CN"),
            ("Bonjour le monde", "fr", "zh-CN")
        ]
        
        for text, source_lang, target_lang in texts_to_translate:
            try:
                print(f"\n📝 翻译: '{text}' ({source_lang} → {target_lang})")
                result = await self.sdk.translate(text, source_lang, target_lang)
                
                print(f"   原文: {result['original']}")
                print(f"   译文: {result['translation']}")
                print(f"   语言: {result['sourceLang']} → {result['targetLang']}")
                
            except Exception as e:
                print(f"   ❌ 翻译失败: {e}")
    
    async def demo_batch_translation(self):
        """演示批量翻译功能"""
        print("\n" + "="*60)
        print("📦 批量翻译演示")
        print("="*60)
        
        # 准备批量翻译的文本
        texts = [
            "Welcome to our VR translation service",
            "This is a powerful translation API",
            "It supports multiple languages",
            "Real-time translation is available",
            "WebSocket communication is supported"
        ]
        
        try:
            print(f"\n📦 批量翻译 {len(texts)} 条文本...")
            result = await self.sdk.batch_translate(texts, "en", "zh-CN")
            
            print(f"   总数: {result['total']}")
            print(f"   成功: {result['successful']}")
            print(f"   失败: {result['failed']}")
            print("   结果:")
            
            for item in result['results']:
                if item['success']:
                    print(f"   {item['index'] + 1}. {item['original']} → {item['translation']}")
                else:
                    print(f"   {item['index'] + 1}. {item['original']} → [错误: {item['error']}]")
                    
        except Exception as e:
            print(f"   ❌ 批量翻译失败: {e}")
    
    async def demo_ocr_recognition(self):
        """演示OCR识别功能"""
        print("\n" + "="*60)
        print("📷 OCR识别演示")
        print("="*60)
        
        # 创建一个示例图片（实际使用中应该是真实图片）
        try:
            # 创建一个简单的文本图片
            image = self.create_text_image("Hello OCR World!", (400, 100))
            
            # 转换为base64
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            image_bytes = buffer.getvalue()
            
            print("📷 OCR识别测试图片...")
            result = await self.sdk.ocr(image_bytes)
            
            print(f"   识别文字: {result['text']}")
            print(f"   识别语言: {result['language']}")
            print(f"   识别时间: {result['timestamp']}")
            
            # OCR识别后翻译
            print("\n🔍➡️📝 OCR识别后翻译...")
            translate_result = await self.sdk.ocr_translate(image_bytes, "en", "zh-CN")
            
            print(f"   原文: {translate_result['original']}")
            print(f"   译文: {translate_result['translation']}")
            print(f"   语言: {translate_result['sourceLang']} → {translate_result['targetLang']}")
            
        except Exception as e:
            print(f"   ❌ OCR处理失败: {e}")
    
    def create_text_image(self, text, size=(400, 100)):
        """创建包含文本的示例图片"""
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # 创建白色背景图片
            image = Image.new('RGB', size, color='white')
            draw = ImageDraw.Draw(image)
            
            # 尝试使用系统字体，如果失败则使用默认字体
            try:
                # 在不同系统上尝试不同的字体
                font_paths = [
                    '/System/Library/Fonts/Arial.ttf',  # macOS
                    'C:/Windows/Fonts/arial.ttf',       # Windows
                    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',  # Linux
                ]
                
                font = None
                for font_path in font_paths:
                    if Path(font_path).exists():
                        font = ImageFont.truetype(font_path, 20)
                        break
                
                if not font:
                    font = ImageFont.load_default()
                    
            except:
                font = ImageFont.load_default()
            
            # 获取文本边界框
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # 居中绘制文本
            x = (size[0] - text_width) // 2
            y = (size[1] - text_height) // 2
            
            draw.text((x, y), text, fill='black', font=font)
            
            return image
            
        except ImportError:
            # 如果PIL不可用，创建一个简单的彩色图片
            return Image.new('RGB', size, color='lightblue')
    
    async def demo_websocket_communication(self):
        """演示WebSocket实时通信"""
        print("\n" + "="*60)
        print("⚡ WebSocket实时通信演示")
        print("="*60)
        
        try:
            # 连接WebSocket
            print("🔌 连接WebSocket服务器...")
            await self.sdk.connect_websocket()
            
            # 设置消息监听器
            def on_translation_result(message):
                print(f"📥 收到翻译结果: {message['payload']}")
            
            def on_system_message(message):
                print(f"📥 收到系统消息: {message['payload']}")
            
            self.sdk.on_websocket_message('translation_result', on_translation_result)
            self.sdk.on_websocket_message('system', on_system_message)
            
            # 发送不同类型的消息
            print("\n👁️ 发送眼动数据...")
            await self.sdk.send_gaze_data({
                'x': 150,
                'y': 250,
                'timestamp': int(time.time() * 1000),
                'confidence': 0.92
            })
            
            print("📷 发送截图请求...")
            await self.sdk.send_screenshot({
                'image': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                'sourceLang': 'en',
                'targetLang': 'zh-CN'
            })
            
            print("⚙️ 发送配置更新...")
            await self.sdk.send_config({
                'gaze': {
                    'threshold': 2.5,
                    'radius': 60
                },
                'translation': {
                    'sourceLanguage': 'en',
                    'targetLanguage': 'zh-CN'
                }
            })
            
            # 等待消息响应
            print("⏳ 等待消息响应...")
            await asyncio.sleep(3)
            
        except Exception as e:
            print(f"❌ WebSocket通信失败: {e}")
        finally:
            await self.sdk.disconnect_websocket()
            print("🔌 WebSocket连接已断开")
    
    async def demo_service_monitoring(self):
        """演示服务监控功能"""
        print("\n" + "="*60)
        print("📊 服务监控演示")
        print("="*60)
        
        try:
            # 获取支持的语言列表
            print("🌍 获取支持的语言...")
            languages = await self.sdk.get_languages()
            
            print(f"   常用语言: {len(languages['common'])} 种")
            for lang in languages['common'][:5]:  # 只显示前5种
                print(f"   - {lang['code']}: {lang['name']} ({lang['nativeName']})")
            
            if len(languages['common']) > 5:
                print(f"   ... 和其他 {len(languages['common']) - 5} 种语言")
            
            # 获取服务统计信息
            print("\n📈 获取服务统计...")
            stats = await self.sdk.get_stats()
            
            service = stats['service']
            performance = stats['performance']
            features = stats['features']
            limits = stats['limits']
            
            print(f"   服务名称: {service['name']}")
            print(f"   服务版本: {service['version']}")
            print(f"   运行状态: {service['status']}")
            print(f"   运行时间: {service['uptime']:.1f} 秒")
            
            print(f"   响应时间: {performance['responseTime']}")
            
            print("   功能支持:")
            for feature, supported in features.items():
                status = "✅" if supported else "❌"
                print(f"   - {feature}: {status}")
            
            print("   服务限制:")
            print(f"   - 最大文本长度: {limits['maxTextLength']} 字符")
            print(f"   - 批量处理大小: {limits['maxBatchSize']} 条")
            print(f"   - 最大图片大小: {limits['maxImageSize']}")
            print(f"   - 速率限制: {limits['rateLimit']}")
            
        except Exception as e:
            print(f"❌ 获取服务信息失败: {e}")
    
    async def run_comprehensive_demo(self):
        """运行完整演示"""
        print("🚀 VR翻译服务 Python SDK 综合演示")
        print("=" * 80)
        
        async with self.sdk:
            try:
                # 执行所有演示
                await self.demo_service_monitoring()
                await self.demo_text_translation()
                await self.demo_batch_translation()
                await self.demo_ocr_recognition()
                await self.demo_websocket_communication()
                
                print("\n" + "="*80)
                print("✅ 所有演示完成！VR翻译服务功能正常。")
                print("="*80)
                
            except Exception as e:
                print(f"\n❌ 演示过程中出现错误: {e}")
                print("请确保VR翻译服务已启动 (npm run dev)")
    
    async def interactive_mode(self):
        """交互模式"""
        print("\n🎯 进入交互模式 (输入 'quit' 退出)")
        print("-" * 40)
        
        async with self.sdk:
            while True:
                try:
                    text = input("\n请输入要翻译的文本: ").strip()
                    if text.lower() in ['quit', 'exit', 'q']:
                        print("👋 再见！")
                        break
                    
                    if not text:
                        continue
                    
                    source_lang = input("源语言 (默认 auto): ").strip() or 'auto'
                    target_lang = input("目标语言 (默认 zh-CN): ").strip() or 'zh-CN'
                    
                    print(f"\n🔄 翻译中...")
                    result = await self.sdk.translate(text, source_lang, target_lang)
                    
                    print(f"✅ 翻译结果:")
                    print(f"   原文: {result['original']}")
                    print(f"   译文: {result['translation']}")
                    print(f"   语言: {result['sourceLang']} → {result['targetLang']}")
                    
                except KeyboardInterrupt:
                    print("\n\n👋 用户中断，再见！")
                    break
                except Exception as e:
                    print(f"❌ 翻译失败: {e}")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='VR翻译服务 Python SDK 演示')
    parser.add_argument('--interactive', '-i', action='store_true', 
                       help='进入交互模式')
    parser.add_argument('--demo', '-d', action='store_true', default=True,
                       help='运行完整演示 (默认)')
    
    args = parser.parse_args()
    
    example = TranslationExample()
    
    if args.interactive:
        asyncio.run(example.interactive_mode())
    else:
        asyncio.run(example.run_comprehensive_demo())


if __name__ == "__main__":
    main()