using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using VRTranslate.Network;

namespace VRTranslate.Tests
{
    public class NetworkManagerTests
    {
        private NetworkManager networkManager;
        private GameObject testGameObject;
        
        [SetUp]
        public void SetUp()
        {
            testGameObject = new GameObject("TestNetworkManager");
            networkManager = testGameObject.AddComponent<NetworkManager>();
        }
        
        [TearDown]
        public void TearDown()
        {
            if (networkManager != null && networkManager.IsConnected)
            {
                networkManager.Disconnect();
            }
            
            if (testGameObject != null)
            {
                Object.DestroyImmediate(testGameObject);
            }
        }
        
        [Test]
        public void NetworkManager_Initialization_ShouldSetDefaultValues()
        {
            // Assert
            Assert.IsNotNull(networkManager);
            Assert.IsFalse(networkManager.IsConnected);
            Assert.IsFalse(networkManager.IsConnecting);
        }
        
        [Test]
        public void NetworkManager_SetServerAddress_ShouldUpdateConfiguration()
        {
            // Arrange
            string testHost = "test.example.com";
            int testPort = 9999;
            
            // Act
            networkManager.SetServerAddress(testHost, testPort);
            
            // Assert
            Assert.AreEqual(testHost, networkManager.ServerHost);
            Assert.AreEqual(testPort, networkManager.ServerPort);
        }
        
        [Test]
        public void NetworkManager_ValidateServerAddress_ShouldReturnCorrectResults()
        {
            // Test valid addresses
            Assert.IsTrue(networkManager.ValidateServerAddress("localhost", 8080));
            Assert.IsTrue(networkManager.ValidateServerAddress("192.168.1.1", 8081));
            Assert.IsTrue(networkManager.ValidateServerAddress("example.com", 80));
            
            // Test invalid addresses
            Assert.IsFalse(networkManager.ValidateServerAddress("", 8080));
            Assert.IsFalse(networkManager.ValidateServerAddress("localhost", 0));
            Assert.IsFalse(networkManager.ValidateServerAddress("localhost", -1));
            Assert.IsFalse(networkManager.ValidateServerAddress("localhost", 70000));
        }
        
        [UnityTest]
        public IEnumerator NetworkManager_ConnectionAttempt_ShouldHandleInvalidServer()
        {
            // Arrange
            networkManager.SetServerAddress("invalid.server.com", 9999);
            bool connectionFailed = false;
            
            networkManager.OnConnectionFailed += () => {
                connectionFailed = true;
            };
            
            // Act
            networkManager.Connect();
            
            // Wait for connection attempt to fail
            float timeout = 10f;
            float elapsed = 0f;
            
            while (!connectionFailed && elapsed < timeout)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }
            
            // Assert
            Assert.IsTrue(connectionFailed, "Connection should fail for invalid server");
            Assert.IsFalse(networkManager.IsConnected);
            Assert.IsFalse(networkManager.IsConnecting);
        }
        
        [Test]
        public void NetworkManager_MessageQueuing_ShouldHandleMessagesWhenDisconnected()
        {
            // Arrange
            var testMessage = new NetworkMessage
            {
                Type = "test_message",
                Data = "test_data"
            };
            
            // Act - Send message while disconnected
            networkManager.SendMessage(testMessage);
            
            // Assert - Message should be queued
            Assert.AreEqual(1, networkManager.QueuedMessageCount);
            Assert.IsFalse(networkManager.IsConnected);
        }
        
        [Test]
        public void NetworkManager_MessageSerialization_ShouldProduceValidJson()
        {
            // Arrange
            var testMessage = new NetworkMessage
            {
                Type = "gaze_data",
                Data = new { x = 100, y = 200, confidence = 0.95f }
            };
            
            // Act
            string serialized = networkManager.SerializeMessage(testMessage);
            
            // Assert
            Assert.IsNotEmpty(serialized);
            Assert.IsTrue(serialized.Contains("gaze_data"));
            Assert.IsTrue(serialized.Contains("100"));
            Assert.IsTrue(serialized.Contains("200"));
            Assert.IsTrue(serialized.Contains("0.95"));
        }
        
        [Test]
        public void NetworkManager_MessageDeserialization_ShouldParseValidJson()
        {
            // Arrange
            string jsonMessage = @"{
                ""Type"": ""translation_result"",
                ""Data"": {
                    ""original"": ""Hello"",
                    ""translation"": ""你好""
                }
            }";
            
            // Act
            var message = networkManager.DeserializeMessage(jsonMessage);
            
            // Assert
            Assert.IsNotNull(message);
            Assert.AreEqual("translation_result", message.Type);
            Assert.IsNotNull(message.Data);
        }
        
        [Test]
        public void NetworkManager_ReconnectionLogic_ShouldRespectMaxAttempts()
        {
            // Arrange
            networkManager.SetReconnectionSettings(maxAttempts: 3, delayMs: 100);
            
            // Act & Assert
            Assert.AreEqual(3, networkManager.MaxReconnectionAttempts);
            Assert.AreEqual(100, networkManager.ReconnectionDelayMs);
            Assert.AreEqual(0, networkManager.CurrentReconnectionAttempts);
        }
    }
}