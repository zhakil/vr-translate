using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using VRTranslate.Config;

namespace VRTranslate.Tests
{
    public class ConfigManagerTests
    {
        private ConfigManager configManager;
        
        [SetUp]
        public void SetUp()
        {
            // Create a test GameObject with ConfigManager
            GameObject testObject = new GameObject("TestConfigManager");
            configManager = testObject.AddComponent<ConfigManager>();
        }
        
        [TearDown]
        public void TearDown()
        {
            if (configManager != null)
            {
                Object.DestroyImmediate(configManager.gameObject);
            }
        }
        
        [Test]
        public void ConfigManager_Initialization_ShouldLoadDefaultConfig()
        {
            // Act
            configManager.Initialize();
            
            // Assert
            Assert.IsNotNull(configManager);
            Assert.IsTrue(configManager.IsInitialized);
        }
        
        [Test]
        public void ConfigManager_GetNetworkConfig_ShouldReturnValidConfig()
        {
            // Arrange
            configManager.Initialize();
            
            // Act
            var networkConfig = configManager.GetNetworkConfig();
            
            // Assert
            Assert.IsNotNull(networkConfig);
            Assert.IsNotEmpty(networkConfig.serverHost);
            Assert.Greater(networkConfig.serverPort, 0);
            Assert.Greater(networkConfig.websocketPort, 0);
        }
        
        [Test]
        public void ConfigManager_GetEyeTrackingConfig_ShouldReturnValidConfig()
        {
            // Arrange
            configManager.Initialize();
            
            // Act
            var eyeTrackingConfig = configManager.GetEyeTrackingConfig();
            
            // Assert
            Assert.IsNotNull(eyeTrackingConfig);
            Assert.Greater(eyeTrackingConfig.updateRate, 0);
            Assert.GreaterOrEqual(eyeTrackingConfig.confidenceThreshold, 0);
            Assert.LessOrEqual(eyeTrackingConfig.confidenceThreshold, 1);
        }
        
        [Test]
        public void ConfigManager_UpdateConfig_ShouldPersistChanges()
        {
            // Arrange
            configManager.Initialize();
            var originalConfig = configManager.GetEyeTrackingConfig();
            var newUpdateRate = originalConfig.updateRate + 10;
            
            // Act
            configManager.UpdateEyeTrackingUpdateRate(newUpdateRate);
            var updatedConfig = configManager.GetEyeTrackingConfig();
            
            // Assert
            Assert.AreEqual(newUpdateRate, updatedConfig.updateRate);
            Assert.AreNotEqual(originalConfig.updateRate, updatedConfig.updateRate);
        }
        
        [UnityTest]
        public IEnumerator ConfigManager_AsyncInitialization_ShouldCompleteSuccessfully()
        {
            // Arrange
            bool initializationCompleted = false;
            
            // Act
            configManager.InitializeAsync(() => {
                initializationCompleted = true;
            });
            
            // Wait for initialization
            float timeout = 5f;
            float elapsed = 0f;
            
            while (!initializationCompleted && elapsed < timeout)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }
            
            // Assert
            Assert.IsTrue(initializationCompleted, "Async initialization should complete within timeout");
            Assert.IsTrue(configManager.IsInitialized);
        }
    }
}