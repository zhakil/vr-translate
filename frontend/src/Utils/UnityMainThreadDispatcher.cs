using UnityEngine;
using System;
using System.Collections.Generic;

/**
 * A utility to dispatch actions to be executed on Unity's main thread.
 * This is crucial when handling events from background threads (like WebSocket messages)
 * that need to interact with the Unity scene or APIs.
 */
public class UnityMainThreadDispatcher : MonoBehaviour
{
    private static UnityMainThreadDispatcher _instance;
    private readonly static Queue<Action> _executionQueue = new Queue<Action>();

    public static UnityMainThreadDispatcher Instance()
    {
        if (!_instance)
        {
            _instance = FindObjectOfType<UnityMainThreadDispatcher>();
            if (!_instance)
            {
                var obj = new GameObject("UnityMainThreadDispatcher");
                _instance = obj.AddComponent<UnityMainThreadDispatcher>();
                DontDestroyOnLoad(obj);
            }
        }
        return _instance;
    }

    void Update()
    {
        lock (_executionQueue)
        {
            while (_executionQueue.Count > 0)
            {
                _executionQueue.Dequeue().Invoke();
            }
        }
    }

    public void Enqueue(Action action)
    {
        lock (_executionQueue)
        {
            _executionQueue.Enqueue(action);
        }
    }
}
