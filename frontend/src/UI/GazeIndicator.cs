using UnityEngine;
using UnityEngine.UI;

/**
 * Visual indicator for showing where the user is looking.
 * Can be used with both eye tracking and head gaze tracking.
 */
public class GazeIndicator : MonoBehaviour
{
    [Header("Visual Settings")]
    [Tooltip("Material for the gaze indicator.")]
    public Material indicatorMaterial;

    [Tooltip("Color when gaze is inactive.")]
    public Color inactiveColor = new Color(1f, 1f, 1f, 0.3f);

    [Tooltip("Color when gaze is active/fixated.")]
    public Color activeColor = new Color(0f, 1f, 0f, 0.8f);

    [Tooltip("Color when preparing to trigger (building up fixation).")]
    public Color preparingColor = new Color(1f, 1f, 0f, 0.6f);

    [Header("Animation")]
    [Tooltip("Size of the indicator when inactive.")]
    public float inactiveSize = 0.05f;

    [Tooltip("Size of the indicator when active.")]
    public float activeSize = 0.08f;

    [Tooltip("Animation speed for size and color changes.")]
    public float animationSpeed = 5f;

    [Header("Fixation Progress")]
    [Tooltip("Show progress ring for fixation buildup.")]
    public bool showFixationProgress = true;

    [Tooltip("Progress ring renderer (optional).")]
    public Renderer progressRingRenderer;

    private Renderer mainRenderer;
    private GazeIndicatorState currentState = GazeIndicatorState.Inactive;
    private float targetSize;
    private Color targetColor;
    private float fixationProgress = 0f; // 0 to 1

    public enum GazeIndicatorState
    {
        Inactive,
        Preparing,
        Active
    }

    void Start()
    {
        InitializeIndicator();
    }

    void Update()
    {
        UpdateAnimation();
    }

    private void InitializeIndicator()
    {
        // Get or create renderer
        mainRenderer = GetComponent<Renderer>();
        if (mainRenderer == null)
        {
            // Create a simple sphere mesh if no renderer exists
            var meshFilter = gameObject.AddComponent<MeshFilter>();
            mainRenderer = gameObject.AddComponent<MeshRenderer>();
            
            // Create a simple sphere mesh
            meshFilter.mesh = CreateSphereMesh();
            
            if (indicatorMaterial != null)
            {
                mainRenderer.material = indicatorMaterial;
            }
        }

        // Set initial state
        SetState(GazeIndicatorState.Inactive);
    }

    private Mesh CreateSphereMesh()
    {
        GameObject tempSphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        Mesh sphereMesh = tempSphere.GetComponent<MeshFilter>().mesh;
        DestroyImmediate(tempSphere);
        return sphereMesh;
    }

    public void SetState(GazeIndicatorState newState)
    {
        currentState = newState;

        switch (currentState)
        {
            case GazeIndicatorState.Inactive:
                targetSize = inactiveSize;
                targetColor = inactiveColor;
                break;
            case GazeIndicatorState.Preparing:
                targetSize = Mathf.Lerp(inactiveSize, activeSize, fixationProgress);
                targetColor = preparingColor;
                break;
            case GazeIndicatorState.Active:
                targetSize = activeSize;
                targetColor = activeColor;
                break;
        }
    }

    public void SetFixationProgress(float progress)
    {
        fixationProgress = Mathf.Clamp01(progress);
        
        if (currentState == GazeIndicatorState.Preparing)
        {
            targetSize = Mathf.Lerp(inactiveSize, activeSize, fixationProgress);
        }

        // Update progress ring if available
        if (showFixationProgress && progressRingRenderer != null)
        {
            UpdateProgressRing();
        }
    }

    private void UpdateAnimation()
    {
        // Animate size
        float currentSize = transform.localScale.x;
        float newSize = Mathf.Lerp(currentSize, targetSize, Time.deltaTime * animationSpeed);
        transform.localScale = Vector3.one * newSize;

        // Animate color
        if (mainRenderer != null && mainRenderer.material != null)
        {
            Color currentColor = mainRenderer.material.color;
            Color newColor = Color.Lerp(currentColor, targetColor, Time.deltaTime * animationSpeed);
            mainRenderer.material.color = newColor;
        }
    }

    private void UpdateProgressRing()
    {
        if (progressRingRenderer == null) return;

        // Simple progress ring using material properties
        // This assumes the progress ring material has a "_Progress" property
        Material material = progressRingRenderer.material;
        if (material.HasProperty("_Progress"))
        {
            material.SetFloat("_Progress", fixationProgress);
        }

        // Update ring visibility
        progressRingRenderer.enabled = currentState == GazeIndicatorState.Preparing && fixationProgress > 0.1f;
    }

    // Public API for external systems
    public void OnGazeEnter()
    {
        SetState(GazeIndicatorState.Preparing);
        SetFixationProgress(0f);
    }

    public void OnGazeStay(float progress)
    {
        SetState(GazeIndicatorState.Preparing);
        SetFixationProgress(progress);
    }

    public void OnGazeFixated()
    {
        SetState(GazeIndicatorState.Active);
        SetFixationProgress(1f);
    }

    public void OnGazeExit()
    {
        SetState(GazeIndicatorState.Inactive);
        SetFixationProgress(0f);
    }

    // Helper method to create a simple gaze indicator prefab
    public static GameObject CreateSimpleGazeIndicator()
    {
        GameObject indicator = new GameObject("GazeIndicator");
        
        // Add the GazeIndicator component
        GazeIndicator gazeComp = indicator.AddComponent<GazeIndicator>();
        
        // Create a simple material
        Material mat = new Material(Shader.Find("Standard"));
        mat.color = gazeComp.inactiveColor;
        mat.SetFloat("_Mode", 3); // Transparent mode
        mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
        mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
        mat.SetInt("_ZWrite", 0);
        mat.DisableKeyword("_ALPHATEST_ON");
        mat.EnableKeyword("_ALPHABLEND_ON");
        mat.DisableKeyword("_ALPHAPREMULTIPLY_ON");
        mat.renderQueue = 3000;
        
        gazeComp.indicatorMaterial = mat;
        
        return indicator;
    }
}