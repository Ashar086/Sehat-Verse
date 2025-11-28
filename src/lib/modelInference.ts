import * as tf from '@tensorflow/tfjs';

export type ModelType = 'pneumonia' | 'breastCancer' | 'bone' | 'skin' | 'brainTumor' | 'gemini';

interface InferenceResult {
  prediction: string;
  confidence: number;
  probabilities: { [key: string]: number };
  modelUsed: ModelType;
}

let pneumoniaModel: tf.LayersModel | null = null;
let breastCancerModel: tf.LayersModel | null = null;
let boneModel: tf.GraphModel | null = null;
let skinModel: tf.GraphModel | null = null;
let brainTumorModel: tf.GraphModel | null = null;

/**
 * Load the Pneumonia Detection model
 */
export async function loadPneumoniaModel(): Promise<tf.LayersModel> {
  if (pneumoniaModel) return pneumoniaModel;
  
  try {
    console.log('Loading Pneumonia Detection model...');
    
    // Note: .h5 files need to be converted to TensorFlow.js format first
    // Using tensorflowjs_converter: tensorflowjs_converter --input_format=keras model.h5 outputdir/
    // For now, we'll try to load directly (may fail without conversion)
    
    // Attempt to load as keras model
    pneumoniaModel = await tf.loadLayersModel('/models/pneumonia_detection_cnn_model.h5');
    console.log('Pneumonia model loaded successfully');
    return pneumoniaModel;
  } catch (error) {
    console.error('Failed to load pneumonia model:', error);
    throw new Error('Pneumonia model requires conversion to TensorFlow.js format. Please convert using tensorflowjs_converter.');
  }
}

/**
 * Load the Breast Cancer Detection model
 */
export async function loadBreastCancerModel(): Promise<tf.LayersModel> {
  if (breastCancerModel) return breastCancerModel;
  
  try {
    console.log('Loading Breast Cancer Detection model...');
    
    breastCancerModel = await tf.loadLayersModel('/models/breast_cancer_cnn_model.h5');
    console.log('Breast Cancer model loaded successfully');
    return breastCancerModel;
  } catch (error) {
    console.error('Failed to load breast cancer model:', error);
    throw new Error('Breast Cancer model requires conversion to TensorFlow.js format. Please convert using tensorflowjs_converter.');
  }
}

/**
 * Load the Bone Detection model
 */
export async function loadBoneModel(): Promise<tf.GraphModel> {
  if (boneModel) return boneModel;
  
  try {
    console.log('Loading Bone Detection model...');
    boneModel = await tf.loadGraphModel('/models/bone_detection_model.json');
    console.log('Bone Detection model loaded successfully');
    return boneModel;
  } catch (error) {
    console.error('Failed to load bone model:', error);
    throw new Error('Failed to load Bone Detection model.');
  }
}

/**
 * Load the Skin Detection model
 */
export async function loadSkinModel(): Promise<tf.GraphModel> {
  if (skinModel) return skinModel;
  
  try {
    console.log('Loading Skin Detection model...');
    skinModel = await tf.loadGraphModel('/models/skin_detection_model.json');
    console.log('Skin Detection model loaded successfully');
    return skinModel;
  } catch (error) {
    console.error('Failed to load skin model:', error);
    throw new Error('Failed to load Skin Detection model.');
  }
}

/**
 * Load the Brain Tumor Detection model
 */
export async function loadBrainTumorModel(): Promise<tf.GraphModel> {
  if (brainTumorModel) return brainTumorModel;
  
  try {
    console.log('Loading Brain Tumor Detection model...');
    brainTumorModel = await tf.loadGraphModel('/models/brain_tumor_detection_model.json');
    console.log('Brain Tumor Detection model loaded successfully');
    return brainTumorModel;
  } catch (error) {
    console.error('Failed to load brain tumor model:', error);
    throw new Error('Failed to load Brain Tumor Detection model.');
  }
}

/**
 * Preprocess image for model input
 */
async function preprocessImage(imageElement: HTMLImageElement, targetSize: [number, number] = [224, 224]): Promise<tf.Tensor4D> {
  // Convert image to tensor
  let tensor = tf.browser.fromPixels(imageElement);
  
  // Resize to model input size
  tensor = tf.image.resizeBilinear(tensor, targetSize);
  
  // Normalize to [0, 1] or [-1, 1] depending on model training
  tensor = tensor.div(255.0);
  
  // Add batch dimension
  const batchedTensor = tensor.expandDims(0) as tf.Tensor4D;
  
  // Clean up intermediate tensors
  tensor.dispose();
  
  return batchedTensor;
}

/**
 * Run inference with Pneumonia Detection model
 */
export async function inferPneumonia(imageElement: HTMLImageElement): Promise<InferenceResult> {
  try {
    const model = await loadPneumoniaModel();
    
    // Preprocess image
    const inputTensor = await preprocessImage(imageElement, [224, 224]);
    
    // Run inference
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // Interpret results (binary classification: 0=Normal, 1=Pneumonia)
    const pneumoniaProb = probabilities[0];
    const normalProb = 1 - pneumoniaProb;
    
    const isPneumonia = pneumoniaProb > 0.5;
    const confidence = Math.max(pneumoniaProb, normalProb) * 100;
    
    return {
      prediction: isPneumonia ? 'Pneumonia Detected' : 'Normal',
      confidence: Math.round(confidence),
      probabilities: {
        'Normal': Math.round(normalProb * 100),
        'Pneumonia': Math.round(pneumoniaProb * 100),
      },
      modelUsed: 'pneumonia',
    };
  } catch (error) {
    console.error('Pneumonia inference error:', error);
    throw error;
  }
}

/**
 * Run inference with Breast Cancer Detection model
 */
export async function inferBreastCancer(imageElement: HTMLImageElement): Promise<InferenceResult> {
  try {
    const model = await loadBreastCancerModel();
    
    // Preprocess image
    const inputTensor = await preprocessImage(imageElement, [224, 224]);
    
    // Run inference
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // Interpret results (binary classification: 0=Benign, 1=Malignant)
    const malignantProb = probabilities[0];
    const benignProb = 1 - malignantProb;
    
    const isMalignant = malignantProb > 0.5;
    const confidence = Math.max(malignantProb, benignProb) * 100;
    
    return {
      prediction: isMalignant ? 'Malignant (Cancer)' : 'Benign (Normal)',
      confidence: Math.round(confidence),
      probabilities: {
        'Benign': Math.round(benignProb * 100),
        'Malignant': Math.round(malignantProb * 100),
      },
      modelUsed: 'breastCancer',
    };
  } catch (error) {
    console.error('Breast Cancer inference error:', error);
    throw error;
  }
}

/**
 * Run inference with Bone Detection model
 */
export async function inferBone(imageElement: HTMLImageElement): Promise<InferenceResult> {
  try {
    const model = await loadBoneModel();
    
    // Preprocess image
    const inputTensor = await preprocessImage(imageElement, [224, 224]);
    
    // Run inference
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // Interpret results (binary classification: 0=Normal, 1=Fracture)
    const fractureProb = probabilities[0];
    const normalProb = 1 - fractureProb;
    
    const isFracture = fractureProb > 0.5;
    const confidence = Math.max(fractureProb, normalProb) * 100;
    
    return {
      prediction: isFracture ? 'Fracture Detected' : 'Normal',
      confidence: Math.round(confidence),
      probabilities: {
        'Normal': Math.round(normalProb * 100),
        'Fracture': Math.round(fractureProb * 100),
      },
      modelUsed: 'bone',
    };
  } catch (error) {
    console.error('Bone detection inference error:', error);
    throw error;
  }
}

/**
 * Run inference with Skin Detection model
 */
export async function inferSkin(imageElement: HTMLImageElement): Promise<InferenceResult> {
  try {
    const model = await loadSkinModel();
    
    // Preprocess image
    const inputTensor = await preprocessImage(imageElement, [224, 224]);
    
    // Run inference
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // Interpret results (binary classification: 0=Normal, 1=Abnormal)
    const abnormalProb = probabilities[0];
    const normalProb = 1 - abnormalProb;
    
    const isAbnormal = abnormalProb > 0.5;
    const confidence = Math.max(abnormalProb, normalProb) * 100;
    
    return {
      prediction: isAbnormal ? 'Abnormal Detected' : 'Normal',
      confidence: Math.round(confidence),
      probabilities: {
        'Normal': Math.round(normalProb * 100),
        'Abnormal': Math.round(abnormalProb * 100),
      },
      modelUsed: 'skin',
    };
  } catch (error) {
    console.error('Skin detection inference error:', error);
    throw error;
  }
}

/**
 * Run inference with Brain Tumor Detection model
 */
export async function inferBrainTumor(imageElement: HTMLImageElement): Promise<InferenceResult> {
  try {
    const model = await loadBrainTumorModel();
    
    // Preprocess image
    const inputTensor = await preprocessImage(imageElement, [224, 224]);
    
    // Run inference
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // Interpret results (binary classification: 0=No Tumor, 1=Tumor)
    const tumorProb = probabilities[0];
    const normalProb = 1 - tumorProb;
    
    const hasTumor = tumorProb > 0.5;
    const confidence = Math.max(tumorProb, normalProb) * 100;
    
    return {
      prediction: hasTumor ? 'Tumor Detected' : 'No Tumor',
      confidence: Math.round(confidence),
      probabilities: {
        'No Tumor': Math.round(normalProb * 100),
        'Tumor': Math.round(tumorProb * 100),
      },
      modelUsed: 'brainTumor',
    };
  } catch (error) {
    console.error('Brain tumor detection inference error:', error);
    throw error;
  }
}

/**
 * Load image from base64 string
 */
export function loadImageFromBase64(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Cleanup models from memory
 */
export function disposeModels() {
  if (pneumoniaModel) {
    pneumoniaModel.dispose();
    pneumoniaModel = null;
  }
  if (breastCancerModel) {
    breastCancerModel.dispose();
    breastCancerModel = null;
  }
  if (boneModel) {
    boneModel.dispose();
    boneModel = null;
  }
  if (skinModel) {
    skinModel.dispose();
    skinModel = null;
  }
  if (brainTumorModel) {
    brainTumorModel.dispose();
    brainTumorModel = null;
  }
}
