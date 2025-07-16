import React from "react";
import { Tooltip, Box, Typography, Chip, Divider } from "@mui/material";
import { FaExchangeAlt, FaInfoCircle } from "react-icons/fa";
import {
  getUnitDisplayInfo,
  getConversionPreview,
} from "../utils/unitGroupUtils";

interface UnitTooltipProps {
  unit: string;
  value?: number;
  children: React.ReactElement;
  showConversions?: boolean;
  maxConversions?: number;
}

export default function UnitTooltip({
  unit,
  value,
  children,
  showConversions = true,
  maxConversions = 3,
}: UnitTooltipProps) {
  const unitInfo = getUnitDisplayInfo(unit);

  const tooltipContent = (
    <Box sx={{ p: 1, maxWidth: 300 }}>
      {/* Unit Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: "1.2rem" }}>{unitInfo.icon}</Typography>
        <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
          {unit}
        </Typography>
        <Chip
          label={unitInfo.category}
          size="small"
          variant="outlined"
          sx={{ fontSize: "0.7rem", height: 18 }}
        />
      </Box>

      {/* Unit Group Info */}
      {unitInfo.group && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Group:</strong> {unitInfo.group.name}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block" }}
          >
            {unitInfo.group.description}
          </Typography>
        </>
      )}

      {/* Conversion Examples */}
      {showConversions &&
        unitInfo.isConvertible &&
        unitInfo.convertibleUnits.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
            >
              <FaExchangeAlt size={12} />
              <Typography variant="body2" fontWeight="bold">
                Conversions:
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {unitInfo.convertibleUnits
                .slice(0, maxConversions)
                .map((targetUnit) => {
                  const exampleValue = value || 1;
                  const conversionText = getConversionPreview(
                    exampleValue,
                    unit,
                    targetUnit
                  );

                  return (
                    <Box
                      key={targetUnit}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        bgcolor: "grey.50",
                        px: 1,
                        py: 0.5,
                        borderRadius: 0.5,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        → {targetUnit}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="primary.main"
                        sx={{ fontWeight: "bold" }}
                      >
                        {conversionText}
                      </Typography>
                    </Box>
                  );
                })}

              {unitInfo.convertibleUnits.length > maxConversions && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textAlign: "center", fontStyle: "italic" }}
                >
                  +{unitInfo.convertibleUnits.length - maxConversions} more
                  conversions available
                </Typography>
              )}
            </Box>
          </>
        )}

      {/* No Conversions Available */}
      {!unitInfo.isConvertible && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FaInfoCircle size={12} color="#ff9800" />
            <Typography variant="caption" color="warning.main">
              No automatic conversions available
            </Typography>
          </Box>
        </>
      )}

      {/* Usage Hint */}
      <Divider sx={{ my: 1 }} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontStyle: "italic" }}
      >
        💡 Users can change units at any time - values are automatically
        converted
      </Typography>
    </Box>
  );

  return (
    <Tooltip
      title={tooltipContent}
      arrow
      placement="top"
      sx={{
        "& .MuiTooltip-tooltip": {
          backgroundColor: "background.paper",
          color: "text.primary",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          boxShadow: 3,
          maxWidth: 350,
        },
        "& .MuiTooltip-arrow": {
          color: "background.paper",
          "&:before": {
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
}
