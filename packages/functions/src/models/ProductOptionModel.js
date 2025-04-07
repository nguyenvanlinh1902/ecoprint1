import admin from 'firebase-admin';
import { generateId } from '../utils/helpers.js';

class ProductOptionModel {
  constructor() {
    this.collection = admin.firestore().collection('productOptions');
  }

  // Add a new option
  async create(data) {
    const id = data.id || generateId();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const optionData = {
      id,
      name: data.name,
      description: data.description || '',
      type: data.type || 'print',
      positions: data.positions || [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await this.collection.doc(id).set(optionData);
    return { id, ...optionData };
  }

  // Update an option
  async update(id, data) {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Filter valid fields to update
    const updateData = {
      updatedAt: timestamp
    };
    
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type) updateData.type = data.type;
    if (data.positions) updateData.positions = data.positions;
    
    await this.collection.doc(id).update(updateData);
    
    // Get data after update
    const updatedDoc = await this.collection.doc(id).get();
    return { id, ...updatedDoc.data() };
  }

  // Get all options
  async findAll() {
    const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Get option by ID
  async findById(id) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  // Delete option
  async delete(id) {
    await this.collection.doc(id).delete();
    return { id };
  }

  // Add position to an option
  async addPosition(optionId, positionData) {
    const option = await this.findById(optionId);
    if (!option) throw new Error('Option not found');
    
    const positions = option.positions || [];
    const positionId = positionData.id || generateId();
    
    const newPosition = {
      id: positionId,
      name: positionData.name,
      basePrice: positionData.basePrice || 0,
      default: positionData.default || false
    };
    
    // If this position is marked as default, ensure only one is default
    if (newPosition.default) {
      positions.forEach(pos => {
        if (pos.id !== positionId) {
          pos.default = false;
        }
      });
    }
    
    // Check if position already exists
    const existingIndex = positions.findIndex(p => p.id === positionId);
    if (existingIndex >= 0) {
      positions[existingIndex] = newPosition;
    } else {
      positions.push(newPosition);
    }
    
    // If this is the first position, make it default
    if (positions.length === 1) {
      positions[0].default = true;
    }
    
    await this.update(optionId, { positions });
    return newPosition;
  }

  // Remove position from an option
  async removePosition(optionId, positionId) {
    const option = await this.findById(optionId);
    if (!option) throw new Error('Option not found');
    
    const positions = option.positions || [];
    const removedPosition = positions.find(p => p.id === positionId);
    
    if (!removedPosition) {
      throw new Error('Position not found in this option');
    }
    
    const wasDefault = removedPosition.default;
    const newPositions = positions.filter(p => p.id !== positionId);
    
    // If the removed position was default and there are other positions, make the first one default
    if (wasDefault && newPositions.length > 0) {
      newPositions[0].default = true;
    }
    
    await this.update(optionId, { positions: newPositions });
    return { success: true, removedPosition };
  }
}

const productOptionModel = new ProductOptionModel();
export default productOptionModel; 