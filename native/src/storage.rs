use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::io::{Read, Write};

/// Compress snapshot data using gzip
///
/// # Arguments
/// * `snapshot_json` - JSON string to compress
///
/// # Returns
/// Compressed buffer
pub fn compress_snapshot_data(snapshot_json: String) -> Result<Buffer> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::best());

    encoder
        .write_all(snapshot_json.as_bytes())
        .map_err(|e| Error::from_reason(format!("Compression write error: {}", e)))?;

    let compressed = encoder
        .finish()
        .map_err(|e| Error::from_reason(format!("Compression finish error: {}", e)))?;

    Ok(Buffer::from(compressed))
}

/// Decompress snapshot data from gzip
///
/// # Arguments
/// * `compressed_data` - Compressed buffer
///
/// # Returns
/// Decompressed JSON string
pub fn decompress_snapshot_data(compressed_data: Buffer) -> Result<String> {
    let mut decoder = GzDecoder::new(&compressed_data[..]);
    let mut decompressed = String::new();

    decoder
        .read_to_string(&mut decompressed)
        .map_err(|e| Error::from_reason(format!("Decompression error: {}", e)))?;

    Ok(decompressed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_decompress() {
        let original = r#"{"test":"data","nested":{"value":123}}"#.to_string();

        let compressed = compress_snapshot_data(original.clone()).unwrap();
        assert!(compressed.len() < original.len());

        let decompressed = decompress_snapshot_data(compressed).unwrap();
        assert_eq!(decompressed, original);
    }

    #[test]
    fn test_compression_ratio() {
        // Create a large JSON with repetitive data
        let mut large_json = String::from("{");
        for i in 0..1000 {
            if i > 0 {
                large_json.push(',');
            }
            large_json.push_str(&format!(
                r#""method{}":{{

"duration":100,"executions":[1,2,3,4,5]}}"#,
                i
            ));
        }
        large_json.push('}');

        let original_size = large_json.len();
        let compressed = compress_snapshot_data(large_json).unwrap();
        let compressed_size = compressed.len();

        let compression_ratio = (compressed_size as f64 / original_size as f64) * 100.0;

        // Should achieve at least 70% compression on repetitive data
        assert!(
            compression_ratio < 30.0,
            "Compression ratio too low: {}%",
            compression_ratio
        );
    }
}
