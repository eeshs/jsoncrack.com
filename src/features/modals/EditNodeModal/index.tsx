import React, { useState, useEffect } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, Button, Group, TextInput, Alert } from "@mantine/core";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";

export const EditNodeModal = ({ opened, onClose }: ModalProps) => {
  const selectedNode = useGraph(state => state.selectedNode);
  const setGraph = useGraph(state => state.setGraph);
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});
  const [error, setError] = useState<string>("");
  const setContents = useFile(state => state.setContents);
  const json = useJson(state => state.json);
  const setJson = useJson(state => state.setJson);

  // Initialize edit values when modal opens
  useEffect(() => {
    if (opened && selectedNode?.text) {
      const initialFields: Record<string, any> = {};
      
      // Populate only editable fields (non-array, non-object) from the node
      selectedNode.text.forEach(item => {
        if (item.key && item.type !== "array" && item.type !== "object") {
          initialFields[item.key] = item.value;
        }
      });
      
      setEditedFields(initialFields);
      setError("");
    }
  }, [opened, selectedNode]);

  const handleFieldChange = (key: string, value: any) => {
    setEditedFields(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    try {
      setError("");

      if (!selectedNode?.path || selectedNode.path.length === 0) {
        setError("Invalid node selection");
        return;
      }

      // Parse current JSON
      let jsonObj = JSON.parse(json || "{}");

      // Navigate to the parent of the target node
      let current = jsonObj;
      const path = selectedNode.path;
      
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        current = current[key];
      }

      // Get the target object
      const lastKey = path[path.length - 1];
      const targetObj = current[lastKey];

      // If target is an object, update only the edited fields (preserve everything else)
      if (typeof targetObj === "object" && targetObj !== null && !Array.isArray(targetObj)) {
        // Update only the fields that were edited - this preserves nested objects/arrays
        Object.entries(editedFields).forEach(([key, value]) => {
          targetObj[key] = value;
        });
      } else {
        // If it's a primitive, we can't edit multiple fields
        setError("Cannot edit primitive values with multiple fields");
        return;
      }

      // Update JSON and propagate changes
      const updatedJsonString = JSON.stringify(jsonObj, null, 2);
      setJson(updatedJsonString);
      setContents({
        contents: updatedJsonString,
        hasChanges: true,
      });

      // Rebuild the graph visualization
      setGraph(updatedJsonString);

      // Close the modal
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  };

  const handleCancel = () => {
    setEditedFields({});
    setError("");
    onClose();
  };

  if (!selectedNode) {
    return null;
  }

  return (
    <Modal
      size="md"
      opened={opened}
      onClose={handleCancel}
      centered
      title="Edit Node"
      withCloseButton={false}
    >
      <Stack gap="md" pb="md">
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Editable fields */}
        <Stack gap="md">
          {selectedNode.text?.map(item => {
            // Only show editable fields (skip arrays and objects)
            if (!item.key || item.type === "array" || item.type === "object") {
              return null;
            }
            
            return (
              <TextInput
                key={item.key}
                label={item.key}
                placeholder={`Enter ${item.key}`}
                value={String(editedFields[item.key] ?? "")}
                onChange={e => handleFieldChange(item.key!, e.currentTarget.value)}
              />
            );
          })}
        </Stack>

        {/* Action buttons */}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleCancel} color="red">
            Cancel
          </Button>
          <Button onClick={handleSave} color="green">
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
