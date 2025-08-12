"""
VR Translation Service Python SDK

完整的外部调用客户端SDK，支持REST API和WebSocket实时通信

Version: 1.0.0
Author: VR Translation Team
"""

import asyncio
import base64
import json
import time
from typing import Dict, List, Optional, Union, Callable, Any
import aiohttp
import websockets
import logging


class VRTranslateSDK:
    """VR Translation Service Python SDK"""
    
    def __init__(self, base_url: str = "http://localhost:8080", 
                 websocket_url: str = "ws://localhost:8081",
                 timeout: int = 10, retries: int = 3, debug: bool = False):
        """
        初始化SDK
        
        Args:
            base_url: REST API基础URL
            websocket_url: WebSocket服务器URL
            timeout: 请求超时时间（秒）
            retries: 重试次数
            debug: 是否启用调试模式
        """
        self.config = {
            'base_url': base_url.rstrip('/'),
            'websocket_url': websocket_url,
            'timeout': timeout,
            'retries': retries,
            'debug': debug
        }
        
        self.ws = None
        self.ws_listeners = {}
        self.request_id = 0
        self.session = None
        
        # 设置日志
        if debug:
            logging.basicConfig(level=logging.DEBUG)
            self.logger = logging.getLogger('[VRTranslateSDK]')
        else:
            self.logger = logging.getLogger('[VRTranslateSDK]')
            self.logger.setLevel(logging.WARNING)
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.disconnect_websocket()
        if self.session:
            await self.session.close()
    
    # ===============================
    # REST API方法
    # ===============================
    
    async def translate(self, text: str, source_lang: str = 'auto', 
                       target_lang: str = 'zh-CN') -> Dict[str, Any]:
        """
        翻译文本
        
        Args:
            text: 要翻译的文本
            source_lang: 源语言代码，默认'auto'
            target_lang: 目标语言代码，默认'zh-CN'
            
        Returns:
            翻译结果字典
        """
        data = {
            'text': text,
            'sourceLang': source_lang,
            'targetLang': target_lang
        }
        
        response = await self._request('POST', '/api/translate', data)
        self.logger.debug(f"翻译完成: {response['data']}")
        return response['data']
    
    async def batch_translate(self, texts: List[str], source_lang: str = 'auto',
                             target_lang: str = 'zh-CN') -> Dict[str, Any]:
        """
        批量翻译
        
        Args:
            texts: 要翻译的文本列表
            source_lang: 源语言代码，默认'auto'
            target_lang: 目标语言代码，默认'zh-CN'
            
        Returns:
            批量翻译结果字典
        """
        if not isinstance(texts, list) or len(texts) == 0:
            raise ValueError("texts must be a non-empty list")
        
        if len(texts) > 100:
            raise ValueError("Maximum 100 texts allowed for batch translation")
        
        data = {
            'texts': texts,
            'sourceLang': source_lang,
            'targetLang': target_lang
        }
        
        response = await self._request('POST', '/api/translate/batch', data)
        self.logger.debug(f"批量翻译完成: {response['data']}")
        return response['data']
    
    async def ocr(self, image: Union[str, bytes], lang: str = 'auto') -> Dict[str, Any]:
        """
        OCR识别图片文字
        
        Args:
            image: Base64编码的图片字符串或字节数据
            lang: 识别语言，默认'auto'
            
        Returns:
            OCR识别结果字典
        """
        if isinstance(image, bytes):
            image_data = base64.b64encode(image).decode('utf-8')
            image_data = f"data:image/png;base64,{image_data}"
        else:
            image_data = image
        
        data = {
            'image': image_data,
            'lang': lang
        }
        
        response = await self._request('POST', '/api/ocr', data)
        self.logger.debug(f"OCR识别完成: {response['data']}")
        return response['data']
    
    async def ocr_translate(self, image: Union[str, bytes], source_lang: str = 'auto',
                           target_lang: str = 'zh-CN') -> Dict[str, Any]:
        """
        OCR识别后翻译
        
        Args:
            image: Base64编码的图片字符串或字节数据
            source_lang: 源语言代码，默认'auto'
            target_lang: 目标语言代码，默认'zh-CN'
            
        Returns:
            OCR+翻译结果字典
        """
        if isinstance(image, bytes):
            image_data = base64.b64encode(image).decode('utf-8')
            image_data = f"data:image/png;base64,{image_data}"
        else:
            image_data = image
        
        data = {
            'image': image_data,
            'sourceLang': source_lang,
            'targetLang': target_lang
        }
        
        response = await self._request('POST', '/api/ocr-translate', data)
        self.logger.debug(f"OCR+翻译完成: {response['data']}")
        return response['data']
    
    async def get_languages(self) -> Dict[str, Any]:
        """
        获取支持的语言列表
        
        Returns:
            语言列表字典
        """
        response = await self._request('GET', '/api/languages')
        return response['data']
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        获取服务统计信息
        
        Returns:
            统计信息字典
        """
        response = await self._request('GET', '/api/stats')
        return response['data']
    
    # ===============================
    # WebSocket方法
    # ===============================
    
    async def connect_websocket(self) -> None:
        """连接WebSocket服务器"""
        try:
            self.ws = await websockets.connect(self.config['websocket_url'])
            self.logger.debug("WebSocket连接已建立")
            
            # 启动消息监听任务
            asyncio.create_task(self._websocket_listener())
            
        except Exception as error:
            self.logger.error(f"WebSocket连接失败: {error}")
            raise
    
    async def disconnect_websocket(self) -> None:
        """断开WebSocket连接"""
        if self.ws:
            await self.ws.close()
            self.ws = None
            self.ws_listeners.clear()
            self.logger.debug("WebSocket连接已关闭")
    
    async def send_gaze_data(self, gaze_data: Dict[str, Any]) -> None:
        """
        发送眼动数据
        
        Args:
            gaze_data: 眼动数据字典
        """
        await self._send_websocket_message('gaze', gaze_data)
    
    async def send_screenshot(self, screenshot_data: Dict[str, Any]) -> None:
        """
        发送截图请求
        
        Args:
            screenshot_data: 截图数据字典
        """
        await self._send_websocket_message('screenshot', screenshot_data)
    
    async def send_config(self, config: Dict[str, Any]) -> None:
        """
        发送配置更新
        
        Args:
            config: 配置数据字典
        """
        await self._send_websocket_message('config', config)
    
    def on_websocket_message(self, message_type: str, callback: Callable) -> None:
        """
        监听WebSocket消息
        
        Args:
            message_type: 消息类型
            callback: 回调函数
        """
        if message_type not in self.ws_listeners:
            self.ws_listeners[message_type] = []
        self.ws_listeners[message_type].append(callback)
    
    def off_websocket_message(self, message_type: str, callback: Callable) -> None:
        """
        移除WebSocket消息监听器
        
        Args:
            message_type: 消息类型
            callback: 回调函数
        """
        if message_type in self.ws_listeners:
            try:
                self.ws_listeners[message_type].remove(callback)
            except ValueError:
                pass
    
    # ===============================
    # 内部辅助方法
    # ===============================
    
    async def _request(self, method: str, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        发送HTTP请求
        
        Args:
            method: HTTP方法
            path: API路径
            data: 请求数据
            
        Returns:
            响应数据字典
        """
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        url = f"{self.config['base_url']}{path}"
        
        # 重试机制
        for attempt in range(1, self.config['retries'] + 1):
            try:
                timeout = aiohttp.ClientTimeout(total=self.config['timeout'])
                
                async with self.session.request(
                    method, url, json=data, timeout=timeout
                ) as response:
                    
                    if response.status != 200:
                        raise aiohttp.ClientError(f"HTTP {response.status}: {response.reason}")
                    
                    result = await response.json()
                    
                    if not result.get('success', False):
                        raise Exception(result.get('message', '请求失败'))
                    
                    return result
                    
            except Exception as error:
                if attempt == self.config['retries']:
                    raise error
                
                self.logger.warning(f"请求失败，正在重试 {attempt}/{self.config['retries']}: {error}")
                await asyncio.sleep(2 ** attempt)  # 指数退避
    
    async def _send_websocket_message(self, message_type: str, payload: Dict[str, Any]) -> None:
        """
        发送WebSocket消息
        
        Args:
            message_type: 消息类型
            payload: 消息载荷
        """
        if not self.ws or self.ws.closed:
            raise Exception("WebSocket未连接")
        
        self.request_id += 1
        message = {
            'type': message_type,
            'payload': payload,
            'id': self.request_id,
            'timestamp': int(time.time() * 1000)
        }
        
        await self.ws.send(json.dumps(message))
        self.logger.debug(f"发送WebSocket消息: {message}")
    
    async def _websocket_listener(self) -> None:
        """WebSocket消息监听器"""
        try:
            async for message_data in self.ws:
                try:
                    message = json.loads(message_data)
                    await self._handle_websocket_message(message)
                except json.JSONDecodeError as error:
                    self.logger.error(f"解析WebSocket消息失败: {error}")
                except Exception as error:
                    self.logger.error(f"处理WebSocket消息失败: {error}")
        except websockets.exceptions.ConnectionClosed:
            self.logger.debug("WebSocket连接已关闭")
        except Exception as error:
            self.logger.error(f"WebSocket监听器错误: {error}")
    
    async def _handle_websocket_message(self, message: Dict[str, Any]) -> None:
        """
        处理WebSocket消息
        
        Args:
            message: 接收到的消息
        """
        self.logger.debug(f"收到WebSocket消息: {message}")
        
        message_type = message.get('type')
        if message_type in self.ws_listeners:
            for callback in self.ws_listeners[message_type]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(message)
                    else:
                        callback(message)
                except Exception as error:
                    self.logger.error(f"WebSocket消息处理错误: {error}")


# 使用示例
async def example():
    """使用示例"""
    async with VRTranslateSDK(debug=True) as sdk:
        try:
            # REST API调用示例
            print("=== REST API示例 ===")
            
            # 翻译文本
            result = await sdk.translate('Hello World', 'en', 'zh-CN')
            print(f"翻译结果: {result}")
            
            # 批量翻译
            batch_result = await sdk.batch_translate([
                'Hello', 'World', 'Good morning'
            ], 'en', 'zh-CN')
            print(f"批量翻译结果: {batch_result}")
            
            # 获取支持的语言
            languages = await sdk.get_languages()
            print(f"支持的语言: {languages}")
            
            # 获取服务统计
            stats = await sdk.get_stats()
            print(f"服务统计: {stats}")
            
            # WebSocket调用示例
            print("\\n=== WebSocket示例 ===")
            
            # 连接WebSocket
            await sdk.connect_websocket()
            
            # 设置消息监听器
            def on_translation_result(message):
                print(f"收到翻译结果: {message['payload']}")
            
            sdk.on_websocket_message('translation_result', on_translation_result)
            
            # 发送眼动数据
            await sdk.send_gaze_data({
                'x': 100,
                'y': 200,
                'timestamp': int(time.time() * 1000),
                'confidence': 0.95
            })
            
            # 发送截图
            await sdk.send_screenshot({
                'image': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                'sourceLang': 'en',
                'targetLang': 'zh-CN'
            })
            
            # 等待消息
            await asyncio.sleep(2)
            
        except Exception as error:
            print(f"调用失败: {error}")


if __name__ == "__main__":
    # 运行示例
    asyncio.run(example())